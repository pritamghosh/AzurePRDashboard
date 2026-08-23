package io.github.pritamghosh.azuredashboard.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import io.github.pritamghosh.azuredashboard.client.AzureDevOpsClient;
import io.github.pritamghosh.azuredashboard.client.PullRequestSearchCriteria;
import io.github.pritamghosh.azuredashboard.client.model.AzurePullRequest;
import io.github.pritamghosh.azuredashboard.config.AzureDevOpsProperties;
import io.github.pritamghosh.azuredashboard.config.RepositoryGroupConfig;
import io.github.pritamghosh.azuredashboard.context.CurrentUserContext;
import io.github.pritamghosh.azuredashboard.model.DashboardSummaryDto;
import io.github.pritamghosh.azuredashboard.model.PolicyEvaluationDto;
import io.github.pritamghosh.azuredashboard.model.PullRequestDto;
import io.github.pritamghosh.azuredashboard.model.RepositoryCountDto;
import io.github.pritamghosh.azuredashboard.model.RepositoryGroupDto;
import io.github.pritamghosh.azuredashboard.model.ReviewerDto;
import io.github.pritamghosh.azuredashboard.model.WorkItemDto;
import io.github.pritamghosh.azuredashboard.client.AzureDevOpsClient.PolicyEvaluation;
import io.github.pritamghosh.azuredashboard.model.PolicyEvaluationDto;
import io.github.pritamghosh.azuredashboard.model.RepositoryGroupSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * Business logic layer.
 * <p>
 * Resolves the current user's identity once, then queries Azure DevOps for:
 * 1. Pull requests created by the user   → "My Pull Requests"
 * 2. Pull requests where user is reviewer → "Awaiting My Review"
 * 3. Repository group summary             → counts grouped by configured prefix rules
 */
@Service
@RequiredArgsConstructor
public class PullRequestService {

    private static final String PR_LINK_FORMAT = "https://%s.visualstudio.com/%s/_git/%s/pullrequest/%s";

    private final AzureDevOpsClient client;
    private final AzureDevOpsProperties props;
    private final CurrentUserContext userContext;

    // ── Public API ─────────────────────────────────────────────────────────

    /**
     * Returns active pull requests created by the authenticated user.
     */
    public List<PullRequestDto> getMyPullRequests() {
        String userId = userContext.getUserId();
        PullRequestSearchCriteria criteria = PullRequestSearchCriteria.builder()
                .creatorId(userId)
                .status("active")
                .build();
        return client.getPullRequests(criteria)
                .map(prs -> prs.stream().map(pr -> toDto(pr, userId)).toList())
                .block();
    }

    public List<PullRequestDto> getReviewPullRequests() {
        String userId = userContext.getUserId();
        PullRequestSearchCriteria criteria = PullRequestSearchCriteria.builder()
                .reviewerId(userId)
                .status("active")
                .build();
        return client.getPullRequests(criteria)
                .map(prs -> prs.stream().map(pr -> toDto(pr, userId)).toList())
                .block();
    }

    public DashboardSummaryDto getSummary() {
        String userId = userContext.getUserId();
        Mono<List<AzurePullRequest>> assignedMono = client.getPullRequests(
                PullRequestSearchCriteria.builder().creatorId(userId).status("active").build());
        Mono<List<AzurePullRequest>> reviewMono = client.getPullRequests(
                PullRequestSearchCriteria.builder().reviewerId(userId).status("active").build());

        return Mono.zip(assignedMono, reviewMono)
                .map(t -> new DashboardSummaryDto(t.getT1().size(), t.getT2().size(), Instant.now()))
                .block();
    }

    /**
     * Refreshes a single pull request by ID and returns an updated DTO.
     * Used by the per-row refresh button on the dashboard.
     * The userId is used to resolve the vote and reviewer type.
     */
    public PullRequestDto refreshPullRequest(int pullRequestId) {
        String userId = userContext.getUserId();
        return client.getPullRequestById(pullRequestId)
                .map(pr -> toDto(pr, userId))
                .block();
    }

    /**
     * Returns work items linked to the given pull request with title, type and state.
     * The PR is fetched first to obtain the repository ID required by the API.
     */
    public List<WorkItemDto> getWorkItems(int pullRequestId) {
        return client.getPullRequestById(pullRequestId)
                .flatMap(pr -> {
                    String repoId = pr.getRepository() != null ? pr.getRepository().getId() : null;
                    if (repoId == null) return Mono.just(List.<WorkItemDto>of());
                    return client.getWorkItems(repoId, pullRequestId);
                })
                .onErrorReturn(List.of())
                .block();
    }

    /**
     * Returns branch policy evaluation results for the given pull request.
     * Policies with status other than "approved" or "notApplicable" are especially
     * relevant — they explain why a PR cannot be merged.
     */
    public List<PolicyEvaluationDto> getPolicyEvaluations(int pullRequestId) {
        String projectId = userContext.getProjectId();
        return client.getPolicyEvaluations(projectId, pullRequestId)
                .map(evals -> evals.stream()
                        .filter(e -> !"notApplicable".equalsIgnoreCase(e.getStatus()))
                        .map(this::toPolicyEvaluationDto)
                        .toList())
                .block();
    }

    private PolicyEvaluationDto toPolicyEvaluationDto(PolicyEvaluation e) {
        // policyType is at the evaluation root; fall back to configuration.type when absent
        String name = "Unknown policy";
        if (e.getPolicyType() != null && e.getPolicyType().getDisplayName() != null) {
            name = e.getPolicyType().getDisplayName();
        } else if (e.getConfiguration() != null && e.getConfiguration().getType() != null
                && e.getConfiguration().getType().getDisplayName() != null) {
            name = e.getConfiguration().getType().getDisplayName();
        }
        return new PolicyEvaluationDto(name, e.getStatus(), e.isBlocking());
    }

    /**
     * Returns PR counts grouped by the repository prefix rules defined in
     * azure.devops.repository-groups configuration.
     * <p>
     * Algorithm:
     * 1. Fetch assigned and review PR lists in parallel.
     * 2. Build a per-repository count map (assigned + review).
     * 3. For each repository, find the first group whose prefix matches
     * the repository name (case-insensitive startsWith).
     * 4. Aggregate totals per group.
     * 5. Repos matching no prefix go into the "Other" catch-all.
     * 6. Empty groups (no active PRs) are omitted from the response.
     */
    public RepositoryGroupSummaryDto getRepositoryGroupSummary() {
        String userId = userContext.getUserId();

        // Fetch both lists in parallel
        record Counts(List<AzurePullRequest> mine, List<AzurePullRequest> review) {
        }
        Counts counts = Mono.zip(
                client.getPullRequests(PullRequestSearchCriteria.builder().creatorId(userId).status("active").build()),
                client.getPullRequests(PullRequestSearchCriteria.builder().reviewerId(userId).status("active").build())
        ).map(t -> new Counts(t.getT1(), t.getT2())).block();

        // Build per-repository count map: repoName → [myCount, reviewCount]
        Map<String, int[]> repoCounts = new LinkedHashMap<>();
        for (AzurePullRequest pr : counts.mine()) {
            repoCounts.computeIfAbsent(repoName(pr), k -> new int[2])[0]++;
        }
        for (AzurePullRequest pr : counts.review()) {
            repoCounts.computeIfAbsent(repoName(pr), k -> new int[2])[1]++;
        }

        List<RepositoryGroupConfig> groupConfigs = props.getRepositoryGroups();

        // Accumulator per configured group (preserving config order)
        Map<String, GroupAccumulator> groupMap = new LinkedHashMap<>();
        for (RepositoryGroupConfig gc : groupConfigs) {
            groupMap.put(gc.getName(), new GroupAccumulator(gc.getName()));
        }
        GroupAccumulator ungroupedAccumulator = new GroupAccumulator("Other");

        // Route each repo to the correct group
        repoCounts.forEach((repo, c) -> {
            RepositoryCountDto repoCntDto = RepositoryCountDto.of(repo, c[0], c[1]);
            String matchedGroup = findGroup(repo, groupConfigs);
            if (matchedGroup != null) {
                groupMap.get(matchedGroup).add(repoCntDto);
            } else {
                ungroupedAccumulator.add(repoCntDto);
            }
        });

        // Build response — skip empty groups
        List<RepositoryGroupDto> groups = groupMap.values().stream()
                .filter(g -> !g.repositories.isEmpty())
                .map(GroupAccumulator::toDto)
                .toList();

        RepositoryGroupDto ungrouped = ungroupedAccumulator.repositories.isEmpty()
                ? null
                : ungroupedAccumulator.toDto();

        return RepositoryGroupSummaryDto.of(groups, ungrouped);
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private String repoName(AzurePullRequest pr) {
        return pr.getRepository() != null && pr.getRepository().getName() != null
                ? pr.getRepository().getName()
                : "Unknown";
    }

    /**
     * Returns the name of the first group whose prefixes contain a match for
     * the given repository name (case-insensitive startsWith).
     * Returns null if no group matches.
     */
    private String findGroup(String repoName, List<RepositoryGroupConfig> configs) {
        String lowerRepo = repoName.toLowerCase();
        for (RepositoryGroupConfig config : configs) {
            for (String prefix : config.getPrefixes()) {
                if (lowerRepo.startsWith(prefix.toLowerCase())) {
                    return config.getName();
                }
            }
        }
        return null;
    }

    private List<PullRequestDto> toDtoList(List<AzurePullRequest> prs) {
        return prs.stream().map(pr -> toDto(pr, null)).toList();
    }

    /**
     * Maps an AzurePullRequest to a PullRequestDto.
     *
     * @param pr     the raw Azure DevOps PR object
     * @param userId the current user's GUID; when non-null, the reviewers list is
     *               scanned to determine whether the user is Required or Optional.
     *               Pass null for PRs created by the user (assigned tab).
     */
    private PullRequestDto toDto(AzurePullRequest pr, String userId) {
        String repo = repoName(pr);
        String author = pr.getCreatedBy() != null ? pr.getCreatedBy().getDisplayName() : "Unknown";
        String url = buildPrLink(pr);
        String reviewerType = resolveReviewerType(pr, userId);
        String group = resolveGroup(repo);
        PullRequestDto.MergeInfo mergeInfo = buildMergeInfo(pr, userId);

        return PullRequestDto.of(
                pr.getPullRequestId(), pr.getTitle(), repo, pr.getStatus(),
                pr.getCreationDate(), author, url, reviewerType, group, mergeInfo);
    }

    private PullRequestDto.MergeInfo buildMergeInfo(AzurePullRequest pr, String userId) {
        String mergeStatus = pr.getMergeStatus() != null ? pr.getMergeStatus() : "notSet";
        boolean draft = pr.isDraft();
        // Ready only when merge checks passed, not a draft, and no required reviewer is still pending
        boolean readyToMerge = "succeeded".equalsIgnoreCase(mergeStatus)
                && !draft
                && !pr.hasUnresolvedRequiredReviewers();

        // Current user's vote (only meaningful for review PRs)
        String myVote = null;
        if (userId != null && pr.getReviewers() != null) {
            myVote = pr.getReviewers().stream()
                    .filter(r -> userId.equalsIgnoreCase(r.getId()))
                    .findFirst()
                    .map(r -> mapVote(r.getVote()))
                    .orElse(null);
        }

        // Auto-complete
        String autoCompleteSetBy        = null;
        String autoCompleteMergeStrategy = null;
        boolean autoCompleteDeleteBranch      = false;
        boolean autoCompleteTransitionWorkItems = false;
        if (pr.getAutoCompleteSetBy() != null) {
            autoCompleteSetBy = pr.getAutoCompleteSetBy().getDisplayName();
            if (pr.getCompletionOptions() != null) {
                autoCompleteMergeStrategy       = pr.getCompletionOptions().getMergeStrategy();
                autoCompleteDeleteBranch        = pr.getCompletionOptions().isDeleteSourceBranch();
                autoCompleteTransitionWorkItems = pr.getCompletionOptions().isTransitionWorkItems();
            }
        }

        return new PullRequestDto.MergeInfo(
                mergeStatus, readyToMerge, draft, myVote,
                autoCompleteSetBy, autoCompleteMergeStrategy,
                autoCompleteDeleteBranch, autoCompleteTransitionWorkItems,
                buildReviewerDtos(pr));
    }

    /**
     * Maps the PR's raw reviewer list to DTOs, sorted required-first then by display name.
     */
    private List<ReviewerDto> buildReviewerDtos(AzurePullRequest pr) {
        if (pr.getReviewers() == null) return List.of();
        return pr.getReviewers().stream()
                .sorted((a, b) -> {
                    if (a.isRequired() != b.isRequired()) return a.isRequired() ? -1 : 1;
                    String nameA = a.getDisplayName() != null ? a.getDisplayName() : "";
                    String nameB = b.getDisplayName() != null ? b.getDisplayName() : "";
                    return nameA.compareToIgnoreCase(nameB);
                })
                .map(r -> new ReviewerDto(
                        r.getDisplayName() != null ? r.getDisplayName() : "Unknown",
                        mapVote(r.getVote()),
                        r.isRequired(),
                        r.isHasDeclined()))
                .toList();
    }

    /**
     * Maps Azure DevOps integer vote to a human-readable string.
     */
    private String mapVote(int vote) {
        return switch (vote) {
            case 10 -> "Approved";
            case 5 -> "ApprovedWithSuggestions";
            case -5 -> "WaitingForAuthor";
            case -10 -> "Rejected";
            default -> "NoVote";
        };
    }

    /**
     * Resolves the configured group name for a repository.
     * Falls back to "Other" if no prefix matches or no groups are configured.
     */
    private String resolveGroup(String repo) {
        String matched = findGroup(repo, props.getRepositoryGroups());
        return matched != null ? matched : "Other";
    }

    /**
     * Finds the current user in the PR's reviewers list and returns
     * "Required" or "Optional". Returns null when userId is null or
     * the user is not found in the list.
     */
    private String resolveReviewerType(AzurePullRequest pr, String userId) {
        if (userId == null || pr.getReviewers() == null) return null;
        return pr.getReviewers().stream()
                .filter(r -> userId.equalsIgnoreCase(r.getId()))
                .findFirst()
                .map(r -> r.isRequired() ? "Required" : "Optional")
                .orElse(null);
    }

    private String buildPrLink(AzurePullRequest pr) {

        return String.format(PR_LINK_FORMAT,
                             props.getOrganization().toLowerCase(),
                             pr.getRepository().getProject().name(),
                             pr.getRepository().getName(),
                             pr.getPullRequestId());
    }

    // ── Inner accumulator (used only during grouping) ──────────────────────

    private static class GroupAccumulator {
        final String name;
        final List<RepositoryCountDto> repositories = new ArrayList<>();
        int myTotal = 0;
        int reviewTotal = 0;

        GroupAccumulator(String name) {
            this.name = name;
        }

        void add(RepositoryCountDto repo) {
            repositories.add(repo);
            myTotal += repo.getMyCount();
            reviewTotal += repo.getReviewCount();
        }

        RepositoryGroupDto toDto() {
            List<RepositoryCountDto> sorted = repositories.stream()
                    .sorted((a, b) -> a.getRepositoryName().compareToIgnoreCase(b.getRepositoryName()))
                    .toList();
            return RepositoryGroupDto.of(name, myTotal, reviewTotal, sorted);
        }
    }
}

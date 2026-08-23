package io.github.pritamghosh.azuredashboard.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.github.pritamghosh.azuredashboard.client.model.AzurePullRequest;
import io.github.pritamghosh.azuredashboard.client.model.AzurePullRequestResponse;
import io.github.pritamghosh.azuredashboard.client.model.ConnectionData;
import io.github.pritamghosh.azuredashboard.config.AzureDevOpsProperties;
import io.github.pritamghosh.azuredashboard.model.WorkItemDto;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriBuilder;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.List;

/**
 * Low-level client that communicates with the Azure DevOps REST API.
 *
 * All methods return reactive types (Mono) so they can be composed
 * without blocking threads.  The service layer calls .block() only when
 * it needs to combine results before returning to the controller.
 *
 * User identity is resolved via the connectionData endpoint which works
 * with any valid PAT — no extra "User Profile" scope required.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AzureDevOpsClient {

    @Qualifier("azureDevOpsWebClient")
    private final WebClient azureClient;
    private final AzureDevOpsProperties props;

    // ── Identity ───────────────────────────────────────────────────────────

    /**
     * Fetches the authenticated user's identity via the connectionData endpoint.
     * Returns the full AuthenticatedUser so callers can access id + displayName
     * in a single API call.
     */
    public Mono<ConnectionData.AuthenticatedUser> getCurrentUser() {
        return azureClient.get()
                .uri("/_apis/connectionData")
                .retrieve()
                .bodyToMono(ConnectionData.class)
                .map(ConnectionData::getAuthenticatedUser);
    }

    // ── Pull Requests — list ────────────────────────────────────────────────

    /**
     * Queries pull requests using a {@link PullRequestSearchCriteria} object.
     * All optional fields are only appended to the request when non-null.
     *
     * API: GET /{project}/_apis/git/pullrequests
     */
    public Mono<List<AzurePullRequest>> getPullRequests(PullRequestSearchCriteria criteria) {
        return azureClient.get()
                .uri(uriBuilder -> buildListUri(uriBuilder, criteria))
                .retrieve()
                .bodyToMono(AzurePullRequestResponse.class)
                .map(r -> r.getValue() != null ? r.getValue() : List.of());
    }

    // ── Pull Requests — single ──────────────────────────────────────────────

    /**
     * Fetches a single pull request by its numeric ID.
     *
     * API: GET /{project}/_apis/git/pullrequests/{pullRequestId}
     *
     * Used for per-row refresh on the dashboard — only the selected PR is re-fetched.
     */
    public Mono<AzurePullRequest> getPullRequestById(int pullRequestId) {
        return azureClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/{project}/_apis/git/pullrequests/{id}")
                        .queryParam("api-version", props.getApiVersion())
                        .build(props.getProject(), pullRequestId))
                .retrieve()
                .bodyToMono(AzurePullRequest.class);
    }

    /**
     * Returns work items linked to a pull request, including title, type and state.
     *
     * Step 1: GET /{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/workitems
     *         → linked work item IDs.
     * Step 2: GET /_apis/wit/workItems?ids={ids}&fields=System.Title,System.WorkItemType,System.State
     *         → details for each ID in a single batch call.
     *
     * The repository ID is required in the step-1 path — the shorter path returns 404.
     */
    public Mono<List<WorkItemDto>> getWorkItems(String repositoryId, int pullRequestId) {
        return azureClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/workitems")
                        .queryParam("api-version", props.getApiVersion())
                        .build(props.getProject(), repositoryId, pullRequestId))
                .retrieve()
                .bodyToMono(PrWorkItemRefListResponse.class)
                .flatMap(refs -> {
                    if (refs.getValue() == null || refs.getValue().isEmpty()) {
                        return Mono.just(List.<WorkItemDto>of());
                    }
                    List<String> ids = refs.getValue().stream()
                            .map(r -> String.valueOf(r.getId()))
                            .toList();
                    return fetchWorkItemDetails(String.join(",", ids));
                })
                .doOnError(e -> log.error("[AzureDevOps] getWorkItems failed for PR {}: {}", pullRequestId, e.getMessage()))
                .onErrorReturn(List.<WorkItemDto>of());
    }

    /** Batch-fetches work item details by comma-separated IDs. */
    private Mono<List<WorkItemDto>> fetchWorkItemDetails(String ids) {
        return azureClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/_apis/wit/workItems")
                        .queryParam("ids", ids)
                        .queryParam("fields", "System.Title,System.WorkItemType,System.State")
                        .queryParam("api-version", props.getApiVersion())
                        .build())
                .retrieve()
                .bodyToMono(WorkItemDetailListResponse.class)
                .map(response -> response.getValue() == null
                        ? List.<WorkItemDto>of()
                        : response.getValue().stream().map(this::toWorkItemDto).toList())
                .doOnError(e -> log.error("[AzureDevOps] fetchWorkItemDetails failed for ids={}: {}", ids, e.getMessage()))
                .onErrorReturn(List.<WorkItemDto>of());
    }

    private WorkItemDto toWorkItemDto(WorkItemDetail detail) {
        WorkItemDetail.Fields f = detail.getFields();
        String title = (f != null && f.getTitle()        != null) ? f.getTitle()        : "Unknown";
        String type  = (f != null && f.getWorkItemType() != null) ? f.getWorkItemType() : "Unknown";
        String state = (f != null && f.getState()        != null) ? f.getState()        : "Unknown";
        String url   = String.format("https://dev.azure.com/%s/%s/_workitems/edit/%d",
                props.getOrganization(), props.getProject(), detail.getId());
        return new WorkItemDto(detail.getId(), title, type, state, url);
    }

    // ── Work-item response types ────────────────────────────────────────────

    /** Wrapper for the PR → work-item refs endpoint. */
    @Getter @Setter @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class PrWorkItemRefListResponse {
        private List<PrWorkItemRef> value;
    }

    @Getter @Setter @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class PrWorkItemRef {
        private int id;
    }

    /** Wrapper for the work-items batch endpoint. */
    @Getter @Setter @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class WorkItemDetailListResponse {
        private List<WorkItemDetail> value;
    }

    @Getter @Setter @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class WorkItemDetail {
        private int id;
        private Fields fields;

        @Getter @Setter @NoArgsConstructor
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Fields {
            @JsonProperty("System.Title")        private String title;
            @JsonProperty("System.WorkItemType") private String workItemType;
            @JsonProperty("System.State")        private String state;
        }
    }

    // ── Project ─────────────────────────────────────────────────────────────

    /**
     * Returns the GUID of the configured Azure DevOps project.
     * Cached in {@link io.github.pritamghosh.azuredashboard.context.CurrentUserContext}.
     *
     * API: GET /_apis/projects/{project}
     */
    public Mono<String> getProjectId() {
        return azureClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/_apis/projects/{project}")
                        .queryParam("api-version", props.getApiVersion())
                        .build(props.getProject()))
                .retrieve()
                .bodyToMono(ProjectResponse.class)
                .map(ProjectResponse::getId);
    }

    @Getter @Setter @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class ProjectResponse {
        private String id;
    }

    // ── Policy Evaluations ──────────────────────────────────────────────────

    /**
     * Returns all branch policy evaluation results for a pull request.
     *
     * API: GET /{project}/_apis/policy/evaluations
     *      ?artifactId=vstfs:///CodeReview/CodeReviewId/{projectId}/{pullRequestId}
     *
     * The artifactId is passed as a URI template variable ({artifactId}) so that
     * Spring's UriBuilder expands it and then encodes the special characters
     * (colons, slashes) correctly before the request is sent.
     */
    public Mono<List<PolicyEvaluation>> getPolicyEvaluations(String projectId, int pullRequestId) {
        String artifactId = "vstfs:///CodeReview/CodeReviewId/" + projectId + "/" + pullRequestId;
        return azureClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/{project}/_apis/policy/evaluations")
                        .queryParam("artifactId", "{artifactId}")
                        .queryParam("api-version", props.getPolicyApiVersion())
                        .build(props.getProject(), artifactId))
                .retrieve()
                .bodyToMono(PolicyEvaluationListResponse.class)
                .map(r -> r.getValue() != null ? r.getValue() : List.<PolicyEvaluation>of())
                .doOnError(e -> log.error("[AzureDevOps] getPolicyEvaluations failed for PR {}: {}", pullRequestId, e.getMessage()))
                .onErrorReturn(List.<PolicyEvaluation>of());
    }

    /** Nested types for the policy/evaluations response. */
    @Getter @Setter @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PolicyEvaluation {
        /** Top-level policy type — present in most API versions. */
        private PolicyType policyType;
        /** approved | rejected | running | queued | notApplicable | broken */
        private String status;
        /**
         * Full policy configuration object.
         * {@code isBlocking} and the fallback {@code type.displayName} live here.
         */
        private Configuration configuration;

        /**
         * Returns true when the policy is configured as blocking (i.e. a non-approved
         * status prevents the PR from being merged).
         * Reads from {@code configuration.isBlocking} — where Azure DevOps actually places it.
         */
        public boolean isBlocking() {
            return configuration != null && configuration.isBlocking();
        }

        @Getter @Setter @NoArgsConstructor
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class PolicyType {
            private String displayName;
        }

        /**
         * Subset of the {@code configuration} object returned by the policy/evaluations API.
         * {@code isBlocking} is stored here, not at the evaluation root level.
         */
        @Getter @Setter @NoArgsConstructor
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Configuration {
            /**
             * Field is named {@code blocking} so Lombok generates {@code isBlocking()} /
             * {@code setBlocking()} — Jackson maps the JSON key {@code "isBlocking"} via
             * {@code @JsonProperty}.
             */
            @JsonProperty("isBlocking")
            private boolean blocking;
            /** Fallback source for the policy display name. */
            private PolicyType type;
        }
    }

    @Getter @Setter @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class PolicyEvaluationListResponse {
        private List<PolicyEvaluation> value;
        private int count;
    }

    // ── Private URI builder ─────────────────────────────────────────────────

    private URI buildListUri(UriBuilder b, PullRequestSearchCriteria c) {
        b.path("/{project}/_apis/git/pullrequests");

        if (c.getCreatorId()          != null) b.queryParam("searchCriteria.creatorId",          c.getCreatorId());
        if (c.getReviewerId()         != null) b.queryParam("searchCriteria.reviewerId",         c.getReviewerId());
        if (c.getRepositoryId()       != null) b.queryParam("searchCriteria.repositoryId",       c.getRepositoryId());
        if (c.getStatus()             != null) b.queryParam("searchCriteria.status",             c.getStatus());
        if (c.getTargetRefName()      != null) b.queryParam("searchCriteria.targetRefName",      c.getTargetRefName());
        if (c.getSourceRefName()      != null) b.queryParam("searchCriteria.sourceRefName",      c.getSourceRefName());
        if (c.getSourceRepositoryId() != null) b.queryParam("searchCriteria.sourceRepositoryId", c.getSourceRepositoryId());
        if (c.getTop()                != null) b.queryParam("$top",                              c.getTop());
        if (c.getSkip()               != null) b.queryParam("$skip",                             c.getSkip());
        if (c.getIncludeLinks()       != null) b.queryParam("searchCriteria.includeLinks",       c.getIncludeLinks());

        b.queryParam("api-version", props.getApiVersion());
        return b.build(props.getProject());
    }
}

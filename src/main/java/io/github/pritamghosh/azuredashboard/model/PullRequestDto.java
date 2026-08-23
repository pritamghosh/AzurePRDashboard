package io.github.pritamghosh.azuredashboard.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * Data Transfer Object for a Pull Request sent to the React frontend.
 * Use the static {@code of()} factory methods to construct instances.
 */
@Getter
public class PullRequestDto {

    private int id;
    private String title;
    private String repositoryName;
    private String status;
    private String createdDate;
    private String author;
    private String url;
    private String reviewerType;
    private String group;

    /**
     * Merge readiness, vote and auto-complete details.
     * Always populated — never null.
     */
    private MergeInfo mergeInfo;

    private PullRequestDto() {}

    // ── Factories ──────────────────────────────────────────────────────────

    public static PullRequestDto of(int id, String title, String repositoryName, String status,
                                    String createdDate, String author, String url) {
        return of(id, title, repositoryName, status, createdDate, author, url, null, null, MergeInfo.empty());
    }

    public static PullRequestDto of(int id, String title, String repositoryName, String status,
                                    String createdDate, String author, String url, String reviewerType) {
        return of(id, title, repositoryName, status, createdDate, author, url, reviewerType, null, MergeInfo.empty());
    }

    public static PullRequestDto of(int id, String title, String repositoryName, String status,
                                    String createdDate, String author, String url,
                                    String reviewerType, String group) {
        return of(id, title, repositoryName, status, createdDate, author, url, reviewerType, group, MergeInfo.empty());
    }

    public static PullRequestDto of(int id, String title, String repositoryName, String status,
                                    String createdDate, String author, String url,
                                    String reviewerType, String group, MergeInfo mergeInfo) {
        PullRequestDto dto = new PullRequestDto();
        dto.id = id;
        dto.title = title;
        dto.repositoryName = repositoryName;
        dto.status = status;
        dto.createdDate = createdDate;
        dto.author = author;
        dto.url = url;
        dto.reviewerType = reviewerType;
        dto.group = group;
        dto.mergeInfo = mergeInfo != null ? mergeInfo : MergeInfo.empty();
        return dto;
    }

    // ── Nested: MergeInfo ──────────────────────────────────────────────────

    /**
     * Encapsulates merge readiness, the current user's vote, and auto-complete config.
     *
     * mergeStatus values from Azure DevOps API:
     *   succeeded | conflicts | rejectedByPolicy | queued | notSet | failure
     *
     * myVote values:
     *   Approved | ApprovedWithSuggestions | WaitingForAuthor | Rejected | NoVote
     */
    @Getter
    @AllArgsConstructor
    public static class MergeInfo {
        private final String mergeStatus;
        private final boolean readyToMerge;
        private final boolean draft;
        private final String myVote;
        private final String autoCompleteSetBy;
        private final String autoCompleteMergeStrategy;
        private final boolean autoCompleteDeleteSourceBranch;
        /** When true, linked work items are automatically closed on PR completion. */
        private final boolean autoCompleteTransitionWorkItems;
        /**
         * All reviewers on this PR (required first, then optional).
         * Each entry carries displayName, vote, required flag and hasDeclined flag.
         */
        private final List<ReviewerDto> reviewers;

        public static MergeInfo empty() {
            return new MergeInfo("notSet", false, false, null, null, null, false, false, List.of());
        }
    }
}

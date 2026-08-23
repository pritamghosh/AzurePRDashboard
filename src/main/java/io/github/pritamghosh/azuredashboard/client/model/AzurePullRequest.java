package io.github.pritamghosh.azuredashboard.client.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Represents a single Pull Request from the Azure DevOps Git API response.
 */
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AzurePullRequest {

    private int pullRequestId;
    private String title;
    private String status;
    private String creationDate;
    private String mergeStatus;   // succeeded | conflicts | rejectedByPolicy | queued | notSet | failure
    @JsonAlias("isDraft")
    private boolean draft;
    private Repository repository;
    private Identity createdBy;
    private Identity autoCompleteSetBy;
    private List<Reviewer> reviewers;
    private CompletionOptions completionOptions;

    /** Field-level @JsonProperty required for Jackson to deserialise "_links". */
    @JsonProperty("_links")
    private Links links;

    // ── Helper methods ──────────────────────────────────────────────────────

    /**
     * Returns {@code true} when the Azure DevOps merge-status is
     * {@code "rejectedByPolicy"}, indicating at least one branch policy
     * is actively blocking the merge.
     */
    public boolean isRejectedByPolicy() {
        return "rejectedByPolicy".equalsIgnoreCase(mergeStatus);
    }

    /**
     * Returns {@code true} when the PR has at least one <em>required</em>
     * reviewer who has not yet approved (vote ≠ 10).
     *
     * <p>A vote of {@code 10} means "Approved"; any other value (including
     * {@code 0} = NoVote, {@code -5} = WaitingForAuthor, {@code -10} = Rejected)
     * means the requirement is unresolved.
     */
    public boolean hasUnresolvedRequiredReviewers() {
        if (reviewers == null) return false;
        return reviewers.stream()
                .anyMatch(r -> r.isRequired() && r.getVote() != 10);
    }

    // ── Nested types ───────────────────────────────────────────────────────

    @Getter @Setter @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Repository {
        private String name;
        private String id;
        /** The project that owns this repository — provides the project GUID. */
        private ProjectDetails project;
    }

    /** Lightweight project reference carrying the GUID and display name. */
    public record ProjectDetails(String id, String name) {}

    @Getter @Setter @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Identity {
        private String displayName;
        private String id;
        private String uniqueName;
    }

    /**
     * isRequired=true → reviewer's approval is mandatory to complete the PR.
     * vote: 10=Approved, 5=ApprovedWithSuggestions, 0=NoVote, -5=WaitingForAuthor, -10=Rejected
     */
    @Getter @Setter @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Reviewer {
        private String id;
        private String displayName;
        @JsonAlias("isRequired")
        private boolean required;
        private boolean hasDeclined;
        @JsonAlias("isFlagged")
        private boolean flagged;
        private int vote;
    }

    /** Merge completion options set when auto-complete is configured. */
    @Getter @Setter @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CompletionOptions {
        private boolean deleteSourceBranch;
        private boolean squashMerge;
        /** noFastForward | squash | rebase | rebaseMerge */
        private String mergeStrategy;
        /** When true, linked work items are automatically closed on PR completion. */
        private boolean transitionWorkItems;
    }

    @Getter @Setter @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Links {
        private Href web;
    }

    @Getter @Setter @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Href {
        private String href;
    }
}

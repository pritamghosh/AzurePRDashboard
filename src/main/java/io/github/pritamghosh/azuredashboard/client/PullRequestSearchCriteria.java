package io.github.pritamghosh.azuredashboard.client;

import lombok.Builder;
import lombok.Getter;

/**
 * Encapsulates all Azure DevOps Pull Request search criteria query parameters.
 *
 * Maps directly to the searchCriteria.* parameters accepted by:
 * GET https://dev.azure.com/{org}/{project}/_apis/git/pullrequests
 *
 * Builder usage example:
 * <pre>
 *   PullRequestSearchCriteria.builder()
 *       .reviewerId(userId)
 *       .status("active")
 *       .top(200)
 *       .build();
 * </pre>
 */
@Getter
@Builder
public class PullRequestSearchCriteria {

    /** Filter PRs created by this user GUID. */
    private String creatorId;

    /** Filter PRs where this user GUID is a reviewer. */
    private String reviewerId;

    /** Filter to a specific repository by GUID. */
    private String repositoryId;

    /**
     * PR status filter.
     * Values: active | abandoned | completed | notSet | all
     * Defaults to "active".
     */
    @Builder.Default
    private String status = "active";

    /**
     * Filter by target branch ref name.
     * Example: "refs/heads/main"
     */
    private String targetRefName;

    /**
     * Filter by source branch ref name.
     * Example: "refs/heads/feature/my-feature"
     */
    private String sourceRefName;

    /** Filter by source repository GUID (for cross-repo PRs). */
    private String sourceRepositoryId;

    /**
     * Maximum number of PRs to return.
     * Defaults to 100.
     */
    @Builder.Default
    private Integer top = 100;

    /** Number of results to skip (for pagination). */
    private Integer skip;

    /** Whether to include _links in the response. Defaults to true. */
    @Builder.Default
    private Boolean includeLinks = Boolean.TRUE;
}


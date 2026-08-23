package io.github.pritamghosh.azuredashboard.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * A single branch policy evaluation result for a pull request.
 *
 * status values from Azure DevOps policy/evaluations API:
 *   approved | rejected | running | queued | notApplicable | broken
 */
@Getter
@AllArgsConstructor
public class PolicyEvaluationDto {

    /** Human-readable policy name (e.g. "Minimum number of reviewers"). */
    private final String policyName;

    /**
     * Evaluation status.
     * approved | rejected | running | queued | notApplicable | broken
     */
    private final String status;

    /**
     * When true, a non-approved status blocks the PR from being merged.
     */
    private final boolean blocking;
}


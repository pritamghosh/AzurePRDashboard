package io.github.pritamghosh.azuredashboard.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Lightweight reviewer summary sent to the frontend with each pull request.
 * vote values: Approved | ApprovedWithSuggestions | WaitingForAuthor | Rejected | NoVote
 */
@Getter
@AllArgsConstructor
public class ReviewerDto {
    private final String displayName;
    /** Human-readable vote string mapped from the Azure DevOps integer vote. */
    private final String vote;
    private final boolean required;
    private final boolean hasDeclined;
}


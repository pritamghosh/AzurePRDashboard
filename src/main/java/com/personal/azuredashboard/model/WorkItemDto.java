package com.personal.azuredashboard.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Data Transfer Object for a single work item linked to a pull request.
 *
 * Sent to the React frontend as part of the
 * {@code GET /api/pullrequests/{id}/workitems} response.
 */
@Getter
@AllArgsConstructor
public class WorkItemDto {

    /** Azure DevOps work item numeric ID. */
    private final int id;

    /** Work item title (System.Title field). */
    private final String title;

    /**
     * Work item type (System.WorkItemType field).
     * Examples: Bug, Task, User Story, Feature, Epic, Test Case.
     */
    private final String workItemType;

    /**
     * Current state (System.State field).
     * Examples: Active, Resolved, Closed, New.
     */
    private final String state;

    /** Browser-ready URL — opens the work item in Azure DevOps. */
    private final String url;
}


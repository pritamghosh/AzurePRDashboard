package com.personal.azuredashboard.model;

import lombok.Getter;

import java.util.List;

/**
 * Full response payload for GET /api/dashboard/repository-groups.
 *
 * Contains:
 *  - groups: named groups defined in azure.devops.repository-groups config,
 *            only included if they contain at least one PR.
 *  - ungrouped: repos that matched no configured prefix (shown as "Other"),
 *               null if every repo belongs to a configured group.
 */
@Getter
public class RepositoryGroupSummaryDto {

    /**
     * Named groups from config, in config order.
     * Empty groups (no active PRs) are omitted.
     */
    private List<RepositoryGroupDto> groups;

    /**
     * Catch-all group for repositories that did not match any configured prefix.
     * Null when every active repository is covered by a configured group.
     */
    private RepositoryGroupDto ungrouped;

    private RepositoryGroupSummaryDto() {}

    public static RepositoryGroupSummaryDto of(
            List<RepositoryGroupDto> groups,
            RepositoryGroupDto ungrouped) {
        RepositoryGroupSummaryDto dto = new RepositoryGroupSummaryDto();
        dto.groups = groups;
        dto.ungrouped = ungrouped;
        return dto;
    }
}

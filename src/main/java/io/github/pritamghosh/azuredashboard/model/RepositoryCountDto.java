package io.github.pritamghosh.azuredashboard.model;

import lombok.Getter;

/**
 * PR count breakdown for a single repository within a group.
 *
 * Returned as part of RepositoryGroupDto.repositories[].
 */
@Getter
public class RepositoryCountDto {

    private String repositoryName;

    /** PRs in this repo created by the authenticated user. */
    private int myCount;

    /** PRs in this repo where the authenticated user is a reviewer. */
    private int reviewCount;

    /** myCount + reviewCount */
    private int totalCount;

    private RepositoryCountDto() {}

    public static RepositoryCountDto of(String repositoryName, int myCount, int reviewCount) {
        RepositoryCountDto dto = new RepositoryCountDto();
        dto.repositoryName = repositoryName;
        dto.myCount = myCount;
        dto.reviewCount = reviewCount;
        dto.totalCount = myCount + reviewCount;
        return dto;
    }
}

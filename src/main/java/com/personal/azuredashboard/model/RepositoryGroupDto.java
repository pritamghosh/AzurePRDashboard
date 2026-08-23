package com.personal.azuredashboard.model;

import lombok.Getter;

import java.util.List;

/** A named group of repositories with aggregated PR counts. */
@Getter
public class RepositoryGroupDto {

    private String groupName;private int myCount;
    private int reviewCount;
    private int totalCount;
    private List<RepositoryCountDto> repositories;

    private RepositoryGroupDto() {}

    public static RepositoryGroupDto of(String groupName, int myCount, int reviewCount,
                                        List<RepositoryCountDto> repositories) {
        RepositoryGroupDto dto = new RepositoryGroupDto();
        dto.groupName = groupName;
        dto.myCount = myCount;
        dto.reviewCount = reviewCount;
        dto.totalCount = myCount + reviewCount;
        dto.repositories = repositories;
        return dto;
    }
}

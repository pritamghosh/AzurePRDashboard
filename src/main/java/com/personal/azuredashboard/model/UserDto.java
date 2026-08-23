package com.personal.azuredashboard.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Current authenticated user's identity returned by GET /api/user. */
@Getter
@AllArgsConstructor
public class UserDto {
    private final String id;
    private final String displayName;
}


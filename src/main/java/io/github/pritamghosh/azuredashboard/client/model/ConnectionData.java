package io.github.pritamghosh.azuredashboard.client.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Maps the response from:
 * GET https://dev.azure.com/{organization}/_apis/connectionData
 *
 * This endpoint works with any valid PAT — no extra "User Profile" scope required.
 * It is preferred over the VSSPS profile endpoint for resolving the current user's GUID.
 */
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ConnectionData {

    /** The currently authenticated user's identity. */
    private AuthenticatedUser authenticatedUser;

    @Getter
    @Setter
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AuthenticatedUser {

        /** The user's GUID — used as searchCriteria.creatorId / reviewerId in PR queries. */
        private String id;

        /** The user's display name (e.g. "Jane Smith"). */
        private String providerDisplayName;
    }
}

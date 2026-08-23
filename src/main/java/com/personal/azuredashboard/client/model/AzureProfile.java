package com.personal.azuredashboard.client.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Maps the response from:
 * GET https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AzureProfile {

    /** The unique identity ID of the authenticated user (a GUID). */
    private String id;

    /** Display name of the user. */
    private String displayName;

    /** Email address / unique name. */
    private String emailAddress;
}


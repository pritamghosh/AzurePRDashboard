package com.personal.azuredashboard.client.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Wraps the paginated list response from the Azure DevOps pull requests API.
 *
 * Example response:
 * {
 *   "value": [ { ... }, { ... } ],
 *   "count": 2
 * }
 */
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AzurePullRequestResponse {
    private List<AzurePullRequest> value;
    private int count;
}

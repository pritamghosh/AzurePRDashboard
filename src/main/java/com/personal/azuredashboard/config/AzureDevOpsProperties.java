package com.personal.azuredashboard.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

/**
 * Binds configuration properties prefixed with "azure.devops".
 *
 * Safe values live in application.yml (committed to source control).
 * The real PAT, organization, project and repository-groups are set in
 * application-local.yml which is listed in .gitignore and NEVER committed.
 *
 * Activate local config with: -Dspring.profiles.active=local
 */
@Data
@ConfigurationProperties(prefix = "azure.devops")
public class AzureDevOpsProperties {

    /** Personal Access Token – must NEVER be logged or committed. */
    private String pat;

    /** Azure DevOps organisation name (e.g. my-company). */
    private String organization;

    /** Azure DevOps project name (e.g. my-project). */
    private String project;

    /** Azure DevOps REST API version to use for general endpoints. */
    private String apiVersion = "7.1";

    /**
     * API version for preview-only endpoints (e.g. policy/evaluations).
     * These endpoints require the {@code -preview} suffix even on newer API versions.
     */
    private String policyApiVersion = "7.1-preview.1";

    /**
     * When {@code true}, every outgoing WebClient request (URL + headers) and
     * every incoming response (status + headers) is logged at DEBUG level.
     * Enable in application-local.yml during development; keep false in production.
     *
     * <pre>azure.devops.debug-logging: true</pre>
     */
    private boolean debugLogging = false;

    /**
     * Optional repository grouping configuration.
     * Repositories are matched by prefix to a named group.
     * Unmatched repositories appear in an "Other" catch-all group.
     *
     * Example (application-local.yml):
     *   azure.devops.repository-groups:
     *     - name: "Borders Platform"
     *       prefixes: ["borders-", "brd-"]
     */
    private List<RepositoryGroupConfig> repositoryGroups = new ArrayList<>();
}

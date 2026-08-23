package io.github.pritamghosh.azuredashboard.config;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Configuration for a single repository group.
 *
 * Example (application-local.yml):
 *
 *   azure:
 *     devops:
 *       repository-groups:
 *         - name: "Borders Platform"
 *           prefixes:
 *             - "borders-"
 *             - "brd-"
 *         - name: "Infrastructure"
 *           prefixes:
 *             - "infra-"
 *             - "platform-"
 *
 * Any repository whose name starts with one of the configured prefixes
 * (case-insensitive) is placed into this group.
 * Repositories that match no group are placed into an "Other" catch-all group.
 */
@Data
public class RepositoryGroupConfig {

    /** Display name shown in the dashboard widget (e.g. "Borders Platform"). */
    private String name;

    /**
     * List of repository name prefixes that belong to this group.
     * Matching is case-insensitive and uses String.startsWith().
     * The first matching group wins — order matters if prefixes overlap.
     */
    private List<String> prefixes = new ArrayList<>();
}

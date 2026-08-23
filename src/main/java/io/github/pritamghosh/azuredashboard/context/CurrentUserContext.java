package io.github.pritamghosh.azuredashboard.context;

import io.github.pritamghosh.azuredashboard.client.AzureDevOpsClient;
import io.github.pritamghosh.azuredashboard.client.model.ConnectionData;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

/**
 * Holds the identity of the currently authenticated Azure DevOps user.
 *
 * The user ID (GUID) and display name are resolved once on first access via
 * the connectionData API and cached for the lifetime of the application.
 * Call {@link #invalidate()} to force a re-fetch after a PAT rotation.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CurrentUserContext {

    private final AzureDevOpsClient client;

    private volatile String userId;
    private volatile String displayName;
    /** Project GUID — required by the policy/evaluations API. */
    private volatile String projectId;

    /**
     * Returns the current user's GUID.
     * Fetches from Azure DevOps on the first call; returns the cached value thereafter.
     */
    public String getUserId() {
        ensureResolved();
        return userId;
    }

    /**
     * Returns the current user's display name.
     * Fetches from Azure DevOps on the first call; returns the cached value thereafter.
     */
    public String getDisplayName() {
        ensureResolved();
        return displayName;
    }

    /**
     * Returns the project ID.
     * Fetches from Azure DevOps on the first call; returns the cached value thereafter.
     */
    public String getProjectId() {
        ensureResolved();
        return projectId;
    }

    /**
     * Clears the cached user ID and display name so they will be re-fetched on the next call.
     * Call this if the PAT is rotated without restarting the application.
     */
    public void invalidate() {
        log.info("CurrentUserContext invalidated — will re-fetch on next request.");
        userId = displayName = projectId = null;
    }

    // ── Private ────────────────────────────────────────────────────────────

    private void ensureResolved() {
        if (userId == null) {
            synchronized (this) {
                if (userId == null) {
                    log.info("Resolving Azure DevOps user identity and project ID…");
                    // Fetch both in parallel
                    var result = Mono.zip(client.getCurrentUser(), client.getProjectId()).block();
                    ConnectionData.AuthenticatedUser user = result.getT1();
                    userId      = user.getId();
                    displayName = user.getProviderDisplayName();
                    projectId   = result.getT2();
                    log.info("Resolved: {} ({}) — projectId={}", displayName, userId, projectId);
                }
            }
        }
    }
}

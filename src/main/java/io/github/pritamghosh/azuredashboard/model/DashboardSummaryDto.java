package io.github.pritamghosh.azuredashboard.model;

import java.time.Instant;

/**
 * Summary payload returned by GET /api/dashboard/summary.
 */
public class DashboardSummaryDto {

    private int myCount;
    private int reviewCount;
    private Instant lastRefreshed;

    public DashboardSummaryDto(int myCount, int reviewCount, Instant lastRefreshed) {
        this.myCount = myCount;
        this.reviewCount = reviewCount;
        this.lastRefreshed = lastRefreshed;
    }

    public int getMyCount() { return myCount; }
    public int getReviewCount() { return reviewCount; }
    public Instant getLastRefreshed() { return lastRefreshed; }
}

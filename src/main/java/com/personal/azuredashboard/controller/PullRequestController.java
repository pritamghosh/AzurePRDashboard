package com.personal.azuredashboard.controller;

import com.personal.azuredashboard.context.CurrentUserContext;
import com.personal.azuredashboard.model.DashboardSummaryDto;
import com.personal.azuredashboard.model.PolicyEvaluationDto;
import com.personal.azuredashboard.model.PullRequestDto;
import com.personal.azuredashboard.model.RepositoryGroupSummaryDto;
import com.personal.azuredashboard.model.UserDto;
import com.personal.azuredashboard.model.WorkItemDto;
import com.personal.azuredashboard.service.PullRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller that exposes Azure DevOps pull request data to the React frontend.
 *
 * @RestController already serialises return values to JSON with HTTP 200 —
 * no need to wrap in ResponseEntity unless status codes or headers need to vary.
 *
 * @CrossOrigin allows the React dev server (port 5173) to call these endpoints
 * during local development. In production the React app is served by Spring Boot
 * itself (same origin) so CORS is not strictly needed, but it does not hurt.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
@RequiredArgsConstructor
public class PullRequestController {

    private final PullRequestService pullRequestService;
    private final CurrentUserContext userContext;

    /** Returns the current authenticated user's id and display name. GET /api/user */
    @GetMapping("/user")
    public UserDto getCurrentUser() {
        return new UserDto(userContext.getUserId(), userContext.getDisplayName());
    }

    /**
     * Returns active pull requests created by the authenticated user.
     * GET /api/pullrequests/mine
     */
    @GetMapping("/pullrequests/mine")
    public List<PullRequestDto> getMyPullRequests() {
        return pullRequestService.getMyPullRequests();
    }

    /**
     * Returns active pull requests where the authenticated user is a reviewer.
     * GET /api/pullrequests/review
     */
    @GetMapping("/pullrequests/review")
    public List<PullRequestDto> getReviewPullRequests() {
        return pullRequestService.getReviewPullRequests();
    }

    /**
     * Refreshes a single pull request by ID and returns the updated DTO.
     * Called by the per-row refresh button on the dashboard.
     * GET /api/pullrequests/{id}
     */
    @GetMapping("/pullrequests/{id}")
    public PullRequestDto refreshPullRequest(@PathVariable int id) {
        return pullRequestService.refreshPullRequest(id);
    }

    /**
     * Returns work items linked to a pull request with title, type and state.
     * Fetched lazily by the frontend when the merge-status popover is opened.
     * GET /api/pullrequests/{id}/workitems
     */
    @GetMapping("/pullrequests/{id}/workitems")
    public List<WorkItemDto> getWorkItems(@PathVariable int id) {
        return pullRequestService.getWorkItems(id);
    }

    /**
     * Returns branch policy evaluation results for a pull request.
     * Policies with status "notApplicable" are filtered out server-side.
     * GET /api/pullrequests/{id}/policy-evaluations
     */
    @GetMapping("/pullrequests/{id}/policy-evaluations")
    public List<PolicyEvaluationDto> getPolicyEvaluations(@PathVariable int id) {
        return pullRequestService.getPolicyEvaluations(id);
    }

    /**
     * Returns dashboard summary: PR counts + last refresh timestamp.
     * GET /api/dashboard/summary
     */
    @GetMapping("/dashboard/summary")
    public DashboardSummaryDto getDashboardSummary() {
        return pullRequestService.getSummary();
    }

    /**
     * Returns PR counts grouped by repository prefix rules from configuration.
     * Each group contains per-repository breakdowns (assigned + review counts).
     * Repositories matching no configured prefix appear in an "Other" catch-all.
     *
     * GET /api/dashboard/repository-groups
     */
    @GetMapping("/dashboard/repository-groups")
    public RepositoryGroupSummaryDto getRepositoryGroups() {
        return pullRequestService.getRepositoryGroupSummary();
    }
}

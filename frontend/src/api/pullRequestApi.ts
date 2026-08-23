import axios from 'axios';
import type { DashboardSummary, PolicyEvaluation, PullRequest, RepositoryGroupSummary, UserInfo, WorkItem } from '../types/PullRequest';

/**
 * Axios instance pointing to the Spring Boot backend.
 *
 * - In production: React is bundled into the JAR → same origin (no base URL needed).
 * - In development: Vite proxy forwards /api/* to http://localhost:8080.
 */
const api = axios.create({
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Fetches all active pull requests created by the authenticated user. */
export const fetchMyPullRequests = (): Promise<PullRequest[]> =>
  api.get<PullRequest[]>('/api/pullrequests/mine').then((res) => res.data);

/** Fetches all active pull requests where the user is listed as a reviewer. */
export const fetchReviewPullRequests = (): Promise<PullRequest[]> =>
  api.get<PullRequest[]>('/api/pullrequests/review').then((res) => res.data);

/**
 * Refreshes a single pull request by its ID.
 * Used by the per-row refresh button — only that PR is re-fetched.
 */
export const fetchPullRequestById = (id: number): Promise<PullRequest> =>
  api.get<PullRequest>(`/api/pullrequests/${id}`).then((res) => res.data);

/** Returns work items linked to a PR — fetched lazily when the merge-status popover opens. */
export const fetchWorkItems = (id: number): Promise<WorkItem[]> =>
  api.get<WorkItem[]>(`/api/pullrequests/${id}/workitems`).then((res) => res.data);

/** Returns branch policy evaluation results — fetched lazily when the merge-status popover opens. */
export const fetchPolicyEvaluations = (id: number): Promise<PolicyEvaluation[]> =>
  api.get<PolicyEvaluation[]>(`/api/pullrequests/${id}/policy-evaluations`).then((res) => res.data);

/** Fetches the current authenticated user's id and display name. */
export const fetchCurrentUser = (): Promise<UserInfo> =>
  api.get<UserInfo>('/api/user').then((res) => res.data);

/** Fetches the dashboard summary (counts + last refresh time). */
export const fetchDashboardSummary = (): Promise<DashboardSummary> =>
  api.get<DashboardSummary>('/api/dashboard/summary').then((res) => res.data);

/**
 * Fetches PR counts grouped by repository prefix rules from backend config.
 * Each group includes per-repository breakdowns (assigned + review counts).
 * Repositories matching no configured prefix appear in the "Other" catch-all.
 */
export const fetchRepositoryGroupSummary = (): Promise<RepositoryGroupSummary> =>
  api.get<RepositoryGroupSummary>('/api/dashboard/repository-groups').then((res) => res.data);


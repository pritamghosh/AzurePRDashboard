/** Current authenticated user returned by /api/user */
export interface UserInfo {
  id: string;
  displayName: string;
}

/** A single branch policy evaluation result. */
export interface PolicyEvaluation {
  /** Human-readable policy name, e.g. "Minimum number of reviewers". */
  policyName: string;
  /** approved | rejected | running | queued | broken */
  status: string;
  /** When true, a non-approved status blocks the merge. */
  blocking: boolean;
}

/** A work item linked to a pull request. */
export interface WorkItem {
  id: number;
  title: string;
  /** Bug | Task | User Story | Feature | Epic | Test Case | … */
  workItemType: string;
  /** Active | Resolved | Closed | New | … */
  state: string;
  /** Browser-ready URL — opens the work item in Azure DevOps. */
  url: string;
}

/** A reviewer on a pull request. */
export interface ReviewerInfo {
  displayName: string;
  /** Approved | ApprovedWithSuggestions | WaitingForAuthor | Rejected | NoVote */
  vote: string;
  required: boolean;
  hasDeclined: boolean;
}

/** Merge readiness, vote and auto-complete info for a pull request. */
export interface MergeInfo {
  mergeStatus: string;
  readyToMerge: boolean;
  draft: boolean;
  myVote: string | null;
  autoCompleteSetBy: string | null;
  autoCompleteMergeStrategy: string | null;
  autoCompleteDeleteSourceBranch: boolean;
  /** When true, linked work items will be closed automatically on PR completion. */
  autoCompleteTransitionWorkItems: boolean;
  /** All reviewers — required first, then optional, sorted by display name. */
  reviewers: ReviewerInfo[];
}

/** Represents a single pull request returned by /api/pullrequests/* */
export interface PullRequest {
  id: number;
  title: string;
  repositoryName: string;
  status: string;
  createdDate: string;
  author: string;
  url: string;
  reviewerType: 'Required' | 'Optional' | null;
  group: string;
  mergeInfo: MergeInfo;
}

/** Represents the payload from /api/dashboard/summary */
export interface DashboardSummary {
  myCount: number;
  reviewCount: number;
  lastRefreshed: string; // ISO-8601 date string
}

/** PR counts for a single repository within a group */
export interface RepositoryCount {
  repositoryName: string;
  myCount: number;
  reviewCount: number;
  totalCount: number;
}

/** A named group of repositories with aggregated PR counts */
export interface RepositoryGroup {
  groupName: string;
  myCount: number;
  reviewCount: number;
  totalCount: number;
  repositories: RepositoryCount[];
}

/**
 * Full payload from /api/dashboard/repository-groups.
 * groups: named groups from config (empty groups omitted).
 * ungrouped: repos matching no configured prefix, null if all are covered.
 */
export interface RepositoryGroupSummary {
  groups: RepositoryGroup[];
  ungrouped: RepositoryGroup | null;
}


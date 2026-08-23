import React, { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Link,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import EditNoteIcon from '@mui/icons-material/EditNote';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import type { MergeInfo, PolicyEvaluation, ReviewerInfo, WorkItem } from '../types/PullRequest';
import { fetchPolicyEvaluations, fetchWorkItems } from '../api/pullRequestApi';

interface PRMergeStatusBadgeProps {
  mergeInfo: MergeInfo;
  prId: number;
  preloadedPolicies?: PolicyEvaluation[] | null;
  preloadedWorkItems?: WorkItem[] | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  /**
   * Controlled mode — when set, the parent (PRInfoCell) drives which element the
   * popover is anchored to. The badge's own status-icon click calls `onBadgeClick`
   * instead of setting internal state.
   */
  controlledAnchor?: HTMLElement | null;
  /** Called when the status icon is clicked in controlled mode. */
  onBadgeClick?: (e: React.MouseEvent<HTMLElement>) => void;
  /** Called to close the popover in controlled mode. */
  onBadgeClose?: () => void;
}

/**
 * Small icon badge in every PR row.
 * Click → Popover showing:
 *   • Merge policy status
 *   • My vote (review PRs)
 *   • Linked work items — title hyperlinks + type + state
 *   • Branch policies
 *   • Auto-complete config
 *   • Refresh button
 *
 * When `preloadedPolicies` / `preloadedWorkItems` are supplied by a parent
 * component (PRInfoCell), the badge initialises from those values immediately
 * and skips lazy-fetching — the status icon is therefore accurate on first render.
 */
const PRMergeStatusBadge: React.FC<PRMergeStatusBadgeProps> = ({
  mergeInfo, prId,
  preloadedPolicies, preloadedWorkItems,
  onRefresh, refreshing = false,
  controlledAnchor, onBadgeClick, onBadgeClose,
}) => {
  const [internalAnchor,    setInternalAnchor]    = useState<HTMLElement | null>(null);
  const [workItems,         setWorkItems]         = useState<WorkItem[] | null>(preloadedWorkItems ?? null);
  const [workItemsLoading,  setWorkItemsLoading]  = useState(false);
  const [policies,          setPolicies]          = useState<PolicyEvaluation[] | null>(preloadedPolicies ?? null);
  const [policiesLoading,   setPoliciesLoading]   = useState(false);

  // Sync whenever the parent delivers (or clears) preloaded data
  useEffect(() => {
    if (preloadedPolicies !== undefined) setPolicies(preloadedPolicies);
  }, [preloadedPolicies]);

  useEffect(() => {
    if (preloadedWorkItems !== undefined) setWorkItems(preloadedWorkItems);
  }, [preloadedWorkItems]);

  const isControlled = controlledAnchor !== undefined;
  const anchor  = isControlled ? (controlledAnchor ?? null) : internalAnchor;
  const open    = Boolean(anchor);
  const badgeId = open ? 'merge-status-popover' : undefined;

  // Once policies are loaded, override readyToMerge if any blocking policy is not approved.
  const hasBlockingViolations =
    policies !== null && policies.some((p) => p.blocking && p.status !== 'approved');
  const effectiveMergeInfo: MergeInfo = hasBlockingViolations
    ? { ...mergeInfo, readyToMerge: false }
    : mergeInfo;

  const { icon: BadgeIcon, color, tooltip } = getBadgeProps(effectiveMergeInfo);

  const handleStatusIconClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (isControlled) {
      onBadgeClick?.(e);
      return;
    }
    setInternalAnchor(e.currentTarget);
    // Only lazy-fetch if not already provided/loaded
    if (workItems === null && !workItemsLoading) {
      setWorkItemsLoading(true);
      fetchWorkItems(prId)
        .then(setWorkItems)
        .catch(() => setWorkItems([]))
        .finally(() => setWorkItemsLoading(false));
    }
    if (policies === null && !policiesLoading) {
      setPoliciesLoading(true);
      fetchPolicyEvaluations(prId)
        .then(setPolicies)
        .catch(() => setPolicies([]))
        .finally(() => setPoliciesLoading(false));
    }
  };

  const handleClose = () => {
    if (isControlled) {
      onBadgeClose?.();
    } else {
      setInternalAnchor(null);
    }
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkItems(null);
    setPolicies(null);
    onRefresh?.();
  };

  return (
    <>
      <Tooltip title={tooltip} placement="top">
        <IconButton
          size="small"
          onClick={handleStatusIconClick}
          sx={{ p: 0.25 }}
          aria-describedby={badgeId}
        >
          {refreshing
            ? <CircularProgress size={16} />
            : <BadgeIcon sx={{ fontSize: 18, color }} />}
        </IconButton>
      </Tooltip>

      <Popover
        id={badgeId}
        open={open}
        anchorEl={anchor}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { sx: { width: 400, p: 0, borderRadius: 2 } } }}
      >
        {/* ── Header ──────────────────────────────────── */}
        <Box
          sx={{
            px: 2, py: 1.5,
            bgcolor: effectiveMergeInfo.readyToMerge ? 'success.50' : 'grey.100',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <BadgeIcon sx={{ color, fontSize: 20 }} />
            <Box>
              <Typography fontWeight={700} variant="body2" lineHeight={1.2}>
                {effectiveMergeInfo.readyToMerge ? 'Ready to Merge' : 'Not Ready to Merge'}
              </Typography>
              {effectiveMergeInfo.draft && (
                <Chip label="Draft" size="small" variant="outlined"
                  sx={{ mt: 0.25, fontSize: '0.65rem', height: 18 }} />
              )}
            </Box>
          </Box>

          {/* Refresh button only — work-item count is shown in the PRInfoCell column */}
          {onRefresh && (
            <Tooltip title="Refresh this PR">
              <IconButton size="small" onClick={handleRefresh} disabled={refreshing} sx={{ p: 0.25, ml: 2 }}>
                {refreshing
                  ? <CircularProgress size={14} />
                  : <RefreshIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Divider />

        {/* ── Body ────────────────────────────────────── */}
        <Box sx={{ px: 2, py: 1.5 }}>

          {/* Merge policy */}
          <Row label="Merge policy" value={formatMergeStatus(effectiveMergeInfo.mergeStatus)}
            valueColor={mergeStatusColor(effectiveMergeInfo.mergeStatus)} />

          {/* My Vote */}
          {effectiveMergeInfo.myVote && (
            <>
              <Divider sx={{ my: 1 }} />
              <SectionLabel>My Vote</SectionLabel>
              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                {voteIcon(effectiveMergeInfo.myVote)}
                <Typography variant="body2">{formatVote(effectiveMergeInfo.myVote)}</Typography>
              </Box>
            </>
          )}

          {/* Reviewers */}
          {effectiveMergeInfo.reviewers && effectiveMergeInfo.reviewers.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box display="flex" alignItems="center" gap={0.75} mb={0.5}>
                <PeopleAltIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                <SectionLabel>Reviewers</SectionLabel>
              </Box>
              <ReviewerGroup
                label="Required"
                reviewers={effectiveMergeInfo.reviewers.filter((r) => r.required)}
              />
              <ReviewerGroup
                label="Optional"
                reviewers={effectiveMergeInfo.reviewers.filter((r) => !r.required)}
              />
            </>
          )}

          {/* Linked work items */}
          <Divider sx={{ my: 1 }} />
          <SectionLabel>Linked Work Items</SectionLabel>
          {workItemsLoading && (
            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
              <CircularProgress size={12} />
              <Typography variant="caption" color="text.secondary">Loading…</Typography>
            </Box>
          )}
          {!workItemsLoading && workItems !== null && workItems.length === 0 && (
            <Typography variant="body2" color="text.disabled" mt={0.5}>No linked work items</Typography>
          )}
          {!workItemsLoading && workItems && workItems.length > 0 && (
            <Box mt={0.5}>
              {workItems.map((wi) => (
                <Box key={wi.id} display="flex" alignItems="center" gap={0.75} mt={0.75}
                  sx={{ flexWrap: 'nowrap', overflow: 'hidden' }}>
                  <Chip
                    label={wi.workItemType}
                    size="small"
                    sx={{
                      flexShrink: 0,
                      height: 16,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      ...workItemTypeChipStyle(wi.workItemType),
                    }}
                  />
                  <Link
                    href={wi.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    variant="caption"
                    sx={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'primary.main',
                    }}
                    title={`#${wi.id} – ${wi.title}`}
                  >
                    #{wi.id} {wi.title}
                  </Link>
                  <Typography variant="caption" sx={{ flexShrink: 0, fontWeight: 600, color: workItemStateColor(wi.state) }}>
                    {wi.state}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Branch policies */}
          <Divider sx={{ my: 1 }} />
          <SectionLabel>Branch Policies</SectionLabel>
          {policiesLoading && (
            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
              <CircularProgress size={12} />
              <Typography variant="caption" color="text.secondary">Loading…</Typography>
            </Box>
          )}
          {!policiesLoading && policies !== null && policies.length === 0 && (
            <Typography variant="body2" color="text.disabled" mt={0.5}>No policies configured</Typography>
          )}
          {!policiesLoading && policies && policies.length > 0 && (
            <Box mt={0.5}>
              {policies.map((p) => (
                <Box key={p.policyName} display="flex" alignItems="center" justifyContent="space-between" mt={0.5}>
                  <Box display="flex" alignItems="center" gap={0.5} sx={{ maxWidth: 250 }}>
                    {policyStatusIcon(p.status)}
                    <Typography variant="caption" noWrap title={p.policyName}>
                      {p.policyName}
                    </Typography>
                    {p.blocking && p.status !== 'approved' && (
                      <Chip label="blocking" size="small"
                        sx={{ height: 14, fontSize: '0.6rem', bgcolor: '#ffebee', color: '#c62828' }} />
                    )}
                  </Box>
                  <Typography variant="caption" fontWeight={600}
                    color={policyStatusColor(p.status)} sx={{ textTransform: 'capitalize' }}>
                    {p.status}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Auto-complete */}
          <Divider sx={{ my: 1 }} />
          <SectionLabel>Auto-Complete</SectionLabel>
          {mergeInfo.autoCompleteSetBy ? (
            <Box mt={0.5}>
              <Row label="Enabled by"    value={effectiveMergeInfo.autoCompleteSetBy!} />
              <Row label="Strategy"      value={formatMergeStrategy(effectiveMergeInfo.autoCompleteMergeStrategy)} />
              <Row label="Delete branch" value={effectiveMergeInfo.autoCompleteDeleteSourceBranch ? 'Yes' : 'No'} />
              <Row
                label="Close work items"
                value={effectiveMergeInfo.autoCompleteTransitionWorkItems ? 'Yes — auto-close on merge' : 'No'}
                valueColor={effectiveMergeInfo.autoCompleteTransitionWorkItems ? '#2e7d32' : undefined}
              />
            </Box>
          ) : (
            <Typography variant="body2" color="text.disabled" mt={0.5}>Not configured</Typography>
          )}
        </Box>
      </Popover>
    </>
  );
};

// ── Small helpers ──────────────────────────────────────────────────────────

const SectionLabel: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Typography variant="caption" fontWeight={700} color="text.secondary"
    textTransform="uppercase" letterSpacing={0.5}>
    {children}
  </Typography>
);

const Row: React.FC<{ label: string; value: string; valueColor?: string }> = ({ label, value, valueColor }) => (
  <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="caption" fontWeight={600} color={valueColor ?? 'text.primary'}
      sx={{ maxWidth: 190, textAlign: 'right' }}>{value}</Typography>
  </Box>
);

// ── Reviewer helpers ───────────────────────────────────────────────────────

const ReviewerGroup: React.FC<{ label: string; reviewers: ReviewerInfo[] }> = ({ label, reviewers }) => {
  if (reviewers.length === 0) return null;
  return (
    <Box mt={0.5} mb={0.25}>
      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      {reviewers.map((r) => (
        <Box key={r.displayName} display="flex" alignItems="center" justifyContent="space-between" mt={0.4}>
          <Box display="flex" alignItems="center" gap={0.5} sx={{ overflow: 'hidden' }}>
            {reviewerVoteIcon(r.vote, r.hasDeclined)}
            <Typography variant="caption" noWrap title={r.displayName} sx={{ maxWidth: 180 }}>
              {r.displayName}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            fontWeight={600}
            sx={{ flexShrink: 0, color: reviewerVoteColor(r.vote, r.hasDeclined), textTransform: 'capitalize', ml: 1 }}
          >
            {formatVote(r.vote)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

function reviewerVoteIcon(vote: string, hasDeclined: boolean) {
  if (hasDeclined) return <CancelIcon sx={{ fontSize: 13, color: '#c62828' }} />;
  switch (vote) {
    case 'Approved':                return <CheckCircleIcon    sx={{ fontSize: 13, color: '#2e7d32' }} />;
    case 'ApprovedWithSuggestions': return <EditNoteIcon       sx={{ fontSize: 13, color: '#2e7d32' }} />;
    case 'WaitingForAuthor':        return <PauseCircleIcon    sx={{ fontSize: 13, color: '#e65100' }} />;
    case 'Rejected':                return <CancelIcon         sx={{ fontSize: 13, color: '#c62828' }} />;
    default:                        return <HelpOutlineIcon    sx={{ fontSize: 13, color: '#9e9e9e' }} />;
  }
}

function reviewerVoteColor(vote: string, hasDeclined: boolean): string {
  if (hasDeclined) return '#c62828';
  switch (vote) {
    case 'Approved':
    case 'ApprovedWithSuggestions': return '#2e7d32';
    case 'WaitingForAuthor':        return '#e65100';
    case 'Rejected':                return '#c62828';
    default:                        return '#9e9e9e';
  }
}

// ── Work-item helpers ──────────────────────────────────────────────────────

function workItemStateColor(state: string): string {
  switch (state?.toLowerCase()) {
    case 'active':      return '#1565c0'; // blue
    case 'closed':
    case 'resolved':    return '#2e7d32'; // green
    default:               return '#9e9e9e'; // grey (New, To Do, etc.)
  }
}

function workItemTypeChipStyle(type: string): object {
  const map: Record<string, object> = {
    'Bug':        { bgcolor: '#ffebee', color: '#c62828' },
    'Task':       { bgcolor: '#fff8e1', color: '#f57f17' },
    'User Story': { bgcolor: '#e3f2fd', color: '#1565c0' },
    'Feature':    { bgcolor: '#f3e5f5', color: '#6a1b9a' },
    'Epic':       { bgcolor: '#ede7f6', color: '#4527a0' },
    'Test Case':  { bgcolor: '#e8f5e9', color: '#2e7d32' },
    'Issue':      { bgcolor: '#fce4ec', color: '#880e4f' },
  };
  return map[type] ?? { bgcolor: '#eceff1', color: '#37474f' };
}

function getBadgeProps(info: MergeInfo) {
  if (info.draft)         return { icon: EditNoteIcon,       color: '#9e9e9e', tooltip: 'Draft — not ready to merge' };
  if (info.readyToMerge && info.autoCompleteSetBy)
                          return { icon: PlayCircleIcon,     color: '#7b1fa2', tooltip: 'Ready · Auto-complete enabled' };
  if (info.readyToMerge) return { icon: CheckCircleIcon,    color: '#2e7d32', tooltip: 'Ready to merge' };
  switch (info.mergeStatus?.toLowerCase()) {
    case 'conflicts':         return { icon: CancelIcon,         color: '#c62828', tooltip: 'Merge conflicts' };
    case 'rejectedbypolicy':  return { icon: CancelIcon,         color: '#c62828', tooltip: 'Rejected by policy' };
    case 'failure':           return { icon: CancelIcon,         color: '#c62828', tooltip: 'Merge failed' };
    case 'queued':            return { icon: HourglassEmptyIcon, color: '#1565c0', tooltip: 'Merge queued' };
    default:                  return { icon: WarningAmberIcon,   color: '#e65100', tooltip: 'Pending review / checks' };
  }
}

function mergeStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'succeeded':       return '#2e7d32';
    case 'conflicts':
    case 'rejectedbypolicy':
    case 'failure':         return '#c62828';
    case 'queued':          return '#1565c0';
    default:                return '#9e9e9e';
  }
}

function formatMergeStatus(status: string) {
  const map: Record<string, string> = {
    succeeded: '✅ Passed', conflicts: '❌ Merge conflicts',
    rejectedByPolicy: '❌ Rejected by policy', rejectedBypolicy: '❌ Rejected by policy',
    failure: '❌ Merge failed', queued: '🔄 Queued', notSet: '— Not evaluated',
  };
  return map[status] ?? status;
}

function formatVote(vote: string) {
  const map: Record<string, string> = {
    Approved: 'Approved', ApprovedWithSuggestions: 'Approved with suggestions',
    WaitingForAuthor: 'Waiting for author', Rejected: 'Rejected', NoVote: 'No vote yet',
  };
  return map[vote] ?? vote;
}

function voteIcon(vote: string) {
  switch (vote) {
    case 'Approved':                return <ThumbUpIcon    sx={{ fontSize: 16, color: '#2e7d32' }} />;
    case 'ApprovedWithSuggestions': return <EditNoteIcon   sx={{ fontSize: 16, color: '#2e7d32' }} />;
    case 'WaitingForAuthor':        return <PauseCircleIcon sx={{ fontSize: 16, color: '#e65100' }} />;
    case 'Rejected':                return <ThumbDownIcon   sx={{ fontSize: 16, color: '#c62828' }} />;
    default:                        return <HelpOutlineIcon sx={{ fontSize: 16, color: '#9e9e9e' }} />;
  }
}

function policyStatusIcon(status: string) {
  switch (status?.toLowerCase()) {
    case 'approved':      return <CheckCircleIcon    sx={{ fontSize: 14, color: '#2e7d32' }} />;
    case 'rejected':      return <CancelIcon         sx={{ fontSize: 14, color: '#c62828' }} />;
    case 'running':       return <PlayCircleIcon     sx={{ fontSize: 14, color: '#1565c0' }} />;
    case 'queued':        return <HourglassEmptyIcon sx={{ fontSize: 14, color: '#1565c0' }} />;
    case 'broken':        return <CancelIcon         sx={{ fontSize: 14, color: '#e65100' }} />;
    default:              return <HelpOutlineIcon    sx={{ fontSize: 14, color: '#9e9e9e' }} />;
  }
}

function policyStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'approved':  return '#2e7d32';
    case 'rejected':
    case 'broken':    return '#c62828';
    case 'running':
    case 'queued':    return '#1565c0';
    default:          return '#9e9e9e';
  }
}

function formatMergeStrategy(strategy: string | null) {
  if (!strategy) return '—';
  const map: Record<string, string> = {
    noFastForward: 'No fast-forward', squash: 'Squash',
    rebase: 'Rebase', rebaseMerge: 'Rebase + merge',
  };
  return map[strategy] ?? strategy;
}

export default PRMergeStatusBadge;


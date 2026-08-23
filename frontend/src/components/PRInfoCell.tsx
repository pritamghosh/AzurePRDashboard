import React, { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';

import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import LinkIcon from '@mui/icons-material/Link';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import type { PolicyEvaluation, PullRequest, WorkItem } from '../types/PullRequest';
import { fetchPolicyEvaluations, fetchWorkItems } from '../api/pullRequestApi';
import PRMergeStatusBadge from './PRMergeStatusBadge';

interface PRInfoCellProps {
  pr: PullRequest;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** When true, shows the refresh button inside this cell (for tables without a separate refresh column). */
  showRefreshButton?: boolean;
}

/**
 * Unified "Info" cell used in every PR table.
 *
 * On mount it eagerly fetches:
 *   1. Policy evaluations — passed to PRMergeStatusBadge so the status icon
 *      updates immediately without waiting for the user to click.
 *   2. Linked work items — count shown inline; full list available in the popover.
 *
 * Visual layout (compact, all in one cell):
 *   [StatusIcon] [AC-icon?] [WorkItemCount?]   [RefreshButton?]
 */
const PRInfoCell: React.FC<PRInfoCellProps> = ({
  pr, onRefresh, refreshing = false, showRefreshButton = false,
}) => {
  const [workItems,        setWorkItems]        = useState<WorkItem[] | null>(null);
  const [workItemsLoading, setWorkItemsLoading] = useState(false);
  const [policies,         setPolicies]         = useState<PolicyEvaluation[] | null>(null);

  // Controlled popover anchor — shared by status badge, AC icon, and link icon
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);

  // ── Eager fetch on mount ────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    setWorkItemsLoading(true);
    fetchWorkItems(pr.id)
      .then((items) => { if (alive) setWorkItems(items); })
      .catch(() => { if (alive) setWorkItems([]); })
      .finally(() => { if (alive) setWorkItemsLoading(false); });

    fetchPolicyEvaluations(pr.id)
      .then((evals) => { if (alive) setPolicies(evals); })
      .catch(() => { if (alive) setPolicies([]); });

    return () => { alive = false; };
  }, [pr.id]);

  const workItemCount = workItems?.length ?? 0;
  const autoComplete  = pr.mergeInfo.autoCompleteSetBy;

  // Reviewer summary for the inline chip
  const reviewers       = pr.mergeInfo.reviewers ?? [];
  const required        = reviewers.filter((r) => r.required);
  const approvedRequired = required.filter((r) => r.vote === 'Approved' || r.vote === 'ApprovedWithSuggestions').length;
  const totalRequired   = required.length;
  const reviewerChipColor = totalRequired === 0
    ? ('default' as const)
    : approvedRequired === totalRequired
      ? ('success' as const)
      : required.some((r) => r.vote === 'Rejected')
        ? ('error' as const)
        : ('warning' as const);

  const handleOpenPopover = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setPopoverAnchor(e.currentTarget);
  };
  const handleClosePopover = () => setPopoverAnchor(null);

  return (
    <Box display="flex" alignItems="center" gap={0.5} flexWrap="nowrap">
      {/* ── Main status badge (controlled anchor) ── */}
      <PRMergeStatusBadge
        mergeInfo={pr.mergeInfo}
        prId={pr.id}
        preloadedPolicies={policies}
        preloadedWorkItems={workItems}
        onRefresh={onRefresh}
        refreshing={refreshing}
        controlledAnchor={popoverAnchor}
        onBadgeClick={handleOpenPopover}
        onBadgeClose={handleClosePopover}
      />

      {/* ── Auto-complete indicator — click opens same popover ── */}
      {autoComplete && (
        <Tooltip title={`Auto-complete enabled by ${autoComplete}`} placement="top">
          <Box component="span" onClick={handleOpenPopover} sx={{ display: 'flex', cursor: 'pointer', flexShrink: 0 }}>
            <PlayCircleIcon sx={{ fontSize: 16, color: '#7b1fa2' }} />
          </Box>
        </Tooltip>
      )}

      {/* ── Work-item count — click opens same popover ── */}
      {workItemsLoading && (
        <CircularProgress size={12} sx={{ flexShrink: 0 }} />
      )}
      {!workItemsLoading && workItemCount > 0 && (
        <Tooltip title={`${workItemCount} linked work item${workItemCount === 1 ? '' : 's'} — click for details`} placement="top">
          <Badge
            badgeContent={workItemCount}
            color="default"
            onClick={handleOpenPopover}
            sx={{
              flexShrink: 0,
              cursor: 'pointer',
              '& .MuiBadge-badge': {
                fontSize: '0.55rem',
                minWidth: 14,
                height: 14,
                right: -2,
                top: -2,
                bgcolor: 'primary.main',
                color: 'white',
              },
            }}
          >
            <LinkIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          </Badge>
        </Tooltip>
      )}
      {!workItemsLoading && workItemCount === 0 && (
        <Tooltip title="No linked work items — click for details" placement="top">
          <Box component="span" onClick={handleOpenPopover} sx={{ display: 'flex', cursor: 'pointer', flexShrink: 0, opacity: 0.4 }}>
            <LinkIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
          </Box>
        </Tooltip>
      )}

      {/* ── Reviewer summary chip — click opens same popover ── */}
      {totalRequired > 0 && (
        <Tooltip
          title={`Required reviewers: ${approvedRequired}/${totalRequired} approved`}
          placement="top"
        >
          <Chip
            icon={<PeopleAltIcon sx={{ fontSize: '14px !important' }} />}
            label={`${approvedRequired}/${totalRequired}`}
            size="small"
            color={reviewerChipColor}
            variant={approvedRequired === totalRequired ? 'filled' : 'outlined'}
            onClick={handleOpenPopover}
            sx={{
              height: 18,
              fontSize: '0.6rem',
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
              '& .MuiChip-label': { px: 0.5 },
              '& .MuiChip-icon': { ml: 0.25 },
            }}
          />
        </Tooltip>
      )}

      {/* ── Optional inline refresh button ── */}
      {showRefreshButton && onRefresh && (
        <Tooltip title="Refresh this PR" placement="top">
          <span>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onRefresh(); }}
              disabled={refreshing}
              sx={{ p: 0.25, ml: 0.5, flexShrink: 0 }}
            >
              {refreshing
                ? <CircularProgress size={12} />
                : <RefreshIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
};

export default PRInfoCell;


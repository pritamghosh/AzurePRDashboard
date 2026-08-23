import React, { useCallback, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RateReviewIcon from '@mui/icons-material/RateReview';
import type { PullRequest, RepositoryGroup, RepositoryGroupSummary } from '../types/PullRequest';
import { fetchPullRequestById } from '../api/pullRequestApi';
import PRInfoCell from './PRInfoCell';

const PURPLE = '#7b1fa2';
const PURPLE_DARK = '#6a1b9a';

type PRViewType = 'mine' | 'review' | 'all';

interface PRDialog {
  title: string;
  subtitle: string;
  type: PRViewType;
  prs: PullRequest[];
}

interface RepositoryGroupWidgetProps {
  summary: RepositoryGroupSummary | null;
  loading: boolean;
  error: string | null;
  myPRs: PullRequest[];
  reviewPRs: PullRequest[];
  /** Called when the user refreshes an individual PR from inside the dialog. */
  onRefreshPR?: (id: number) => void;
  /** IDs currently being refreshed by the parent (used to show spinner in dialog rows). */
  refreshingPRIds?: Set<number>;
}

const RepositoryGroupWidget: React.FC<RepositoryGroupWidgetProps> = ({
  summary, loading, error, myPRs, reviewPRs,
  onRefreshPR, refreshingPRIds: parentRefreshingIds = new Set(),
}) => {
  const [expanded,  setExpanded]  = useState<Record<string, boolean>>({});
  const [prDialog,  setPRDialog]  = useState<PRDialog | null>(null);
  /** IDs being refreshed within the dialog (local tracking). */
  const [dialogRefreshingIds, setDialogRefreshingIds] = useState<Set<number>>(new Set());

  const toggleAccordion = (name: string) =>
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));

  /** Open the unified PR dialog. */
  const openDialog = (
    title: string,
    subtitle: string,
    type: PRViewType,
    prs: PullRequest[],
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setPRDialog({ title, subtitle, type, prs });
  };

  /**
   * Refresh a single PR from within the dialog.
   * - Notifies the parent (so the tab tables are also updated).
   * - Fetches the latest PR data and patches `prDialog.prs` directly.
   */
  const handleDialogRefreshPR = useCallback(async (id: number) => {
    setDialogRefreshingIds((prev) => new Set(prev).add(id));
    onRefreshPR?.(id);
    try {
      const updated = await fetchPullRequestById(id);
      setPRDialog((prev) =>
        prev ? { ...prev, prs: prev.prs.map((pr) => pr.id === id ? updated : pr) } : null,
      );
    } catch (err) {
      console.error(`Failed to refresh PR #${id} in dialog:`, err);
    } finally {
      setDialogRefreshingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, [onRefreshPR]);

  // Merge parent + local refreshing sets for the dialog rows
  const effectiveRefreshingIds = new Set([...parentRefreshingIds, ...dialogRefreshingIds]);

  if (loading) return <Box display="flex" justifyContent="center" py={3}><CircularProgress size={28} /></Box>;
  if (error)   return <Alert severity="error">{error}</Alert>;
  if (!summary) return null;

  const allGroups: RepositoryGroup[] = [
    ...summary.groups,
    ...(summary.ungrouped ? [summary.ungrouped] : []),
  ];

  if (allGroups.length === 0) {
    return (
      <Alert severity="info">
        No active pull requests found. Add repository-groups to your config to enable grouping.
      </Alert>
    );
  }

  return (
    <>
      <Box>
        {allGroups.map((group, idx) => {
          const isOpen      = expanded[group.groupName] ?? false;
          const isUngrouped = group.groupName === 'Other';

          const groupMine   = myPRs.filter((pr) => pr.group === group.groupName);
          const groupReview = reviewPRs.filter((pr) => pr.group === group.groupName);
          const groupAll = [
            ...new Map(
              [...groupMine, ...groupReview]
                .map(pr => [pr.id, pr])
            ).values()
          ];

          return (
            <Accordion
              key={group.groupName}
              expanded={isOpen}
              onChange={() => toggleAccordion(group.groupName)}
              elevation={1}
              sx={{
                mb: idx < allGroups.length - 1 ? 1 : 0,
                '&:before': { display: 'none' },
                border: '1px solid',
                borderColor: isUngrouped ? 'grey.300' : 'primary.light',
                borderRadius: '6px !important',
              }}
            >
              {/* ── Accordion header ─────────────────────────────────── */}
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  bgcolor: isUngrouped ? 'grey.100' : 'primary.50',
                  borderRadius: isOpen ? '6px 6px 0 0' : '6px',
                  minHeight: 52,
                  '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 },
                }}
              >
                {isOpen
                  ? <FolderOpenIcon fontSize="small" color={isUngrouped ? 'disabled' : 'primary'} />
                  : <FolderIcon     fontSize="small" color={isUngrouped ? 'disabled' : 'primary'} />}

                <Typography fontWeight={600} flexGrow={1}>{group.groupName}</Typography>

                <Stack direction="row" spacing={1} onClick={(e) => e.stopPropagation()}>
                  {/* Mine — always primary filled → opens modal */}
                  <Tooltip title="My pull requests — click to view">
                    <Chip
                      icon={<AssignmentIcon sx={{ fontSize: '14px !important', color: 'inherit !important' }} />}
                      label={group.myCount}
                      size="small" color="primary" variant="filled"
                      onClick={(e) => openDialog('My Pull Requests', group.groupName, 'mine', groupMine, e)}
                      sx={{ fontWeight: 700, cursor: 'pointer' }}
                    />
                  </Tooltip>

                  {/* Review — always warning filled → opens modal */}
                  <Tooltip title="Awaiting my review — click to view">
                    <Chip
                      icon={<RateReviewIcon sx={{ fontSize: '14px !important', color: 'inherit !important' }} />}
                      label={group.reviewCount}
                      size="small" color="warning" variant="filled"
                      onClick={(e) => openDialog('Awaiting My Review', group.groupName, 'review', groupReview, e)}
                      sx={{ fontWeight: 700, cursor: 'pointer' }}
                    />
                  </Tooltip>

                  {/* Total — always purple → opens modal with all */}
                  <Tooltip title="All pull requests — click to view">
                    <Chip
                      label={`${groupAll.length} total`}
                      size="small"
                      onClick={(e) => openDialog('All Pull Requests', group.groupName, 'all', groupAll, e)}
                      sx={{ fontWeight: 700, cursor: 'pointer', bgcolor: PURPLE, color: '#fff', '&:hover': { bgcolor: PURPLE_DARK } }}
                    />
                  </Tooltip>
                </Stack>
              </AccordionSummary>

              {/* ── Accordion body ────────────────────────────────────── */}
              <AccordionDetails sx={{ p: 0 }}>
                <Divider />
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 700, pl: 3 }}>Repository</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: 90 }}>
                        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                          <AssignmentIcon fontSize="inherit" color="primary" /> Mine
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: 90 }}>
                        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                          <RateReviewIcon fontSize="inherit" color="warning" /> Review
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: 90 }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.repositories.map((repo) => {
                      const repoMine   = groupMine.filter((pr) => pr.repositoryName === repo.repositoryName);
                      const repoReview = groupReview.filter((pr) => pr.repositoryName === repo.repositoryName);
                      const repoAll    = [...new Map([...repoMine, ...repoReview].map(pr => [pr.id, pr])).values()] ;

                      return (
                        <TableRow key={repo.repositoryName} hover>
                          <TableCell sx={{ pl: 3 }}>
                            <Typography variant="body2">{repo.repositoryName}</Typography>
                          </TableCell>

                          {/* Mine count chip → modal */}
                          <TableCell align="center">
                            <ClickableCount
                              value={repo.myCount}
                              color="primary"
                              onClick={(e) => repo.myCount > 0 && openDialog('My Pull Requests', repo.repositoryName, 'mine', repoMine, e)}
                            />
                          </TableCell>

                          {/* Review count chip → modal */}
                          <TableCell align="center">
                            <ClickableCount
                              value={repo.reviewCount}
                              color="warning"
                              onClick={(e) => repo.reviewCount > 0 && openDialog('Awaiting My Review', repo.repositoryName, 'review', repoReview, e)}
                            />
                          </TableCell>

                          {/* Total — purple chip → modal with all */}
                          <TableCell align="center">
                            <Chip
                              label={repoAll.length}
                              size="small"
                              onClick={(e) => repoAll.length> 0 && openDialog('All Pull Requests', repo.repositoryName, 'all', repoAll, e)}
                              sx={{
                                fontWeight: 700,
                                minWidth: 28,
                                cursor: repoAll.length > 0 ? 'pointer' : 'default',
                                bgcolor: repoAll.length > 0 ? PURPLE : 'grey.300',
                                color: repoAll.length > 0 ? '#fff' : 'text.disabled',
                                '&:hover': repoAll.length > 0 ? { bgcolor: PURPLE_DARK } : {},
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      {/* ── Unified PR Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={prDialog !== null}
        onClose={() => setPRDialog(null)}
        maxWidth={false}
        PaperProps={{ sx: { width: '92vw', maxWidth: 1400, maxHeight: '85vh' } }}
      >
        {prDialog && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 7, borderBottom: '1px solid', borderColor: 'divider' }}>
              {prDialog.type === 'mine'
                ? <AssignmentIcon color="primary" />
                : prDialog.type === 'review'
                ? <RateReviewIcon color="warning" />
                : <Chip size="small" label="All" sx={{ bgcolor: PURPLE, color: '#fff', fontWeight: 700 }} />}
              <Box>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>{prDialog.title}</Typography>
                <Typography variant="caption" color="text.secondary">{prDialog.subtitle} · {prDialog.prs.length} pull request{prDialog.prs.length !== 1 ? 's' : ''}</Typography>
              </Box>
              <IconButton onClick={() => setPRDialog(null)} size="small" sx={{ position: 'absolute', right: 12, top: 12 }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0, overflow: 'auto' }}>
              {prDialog.prs.length === 0
                ? <Box p={3}><Alert severity="info">No pull requests found.</Alert></Box>
                : (
                  <PRTable
                    prs={prDialog.prs}
                    onRefreshPR={handleDialogRefreshPR}
                    refreshingPRIds={effectiveRefreshingIds}
                  />
                )
              }
            </DialogContent>
          </>
        )}
      </Dialog>
    </>
  );
};

// ── PR table (no horizontal scroll) ───────────────────────────────────────
const PRTable: React.FC<{
  prs: PullRequest[];
  onRefreshPR?: (id: number) => void;
  refreshingPRIds?: Set<number>;
}> = ({ prs, onRefreshPR, refreshingPRIds = new Set() }) => (
  <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
    <TableHead>
      <TableRow sx={{ bgcolor: 'grey.50' }}>
        <TableCell sx={{ fontWeight: 700, pl: 3, width: '32%' }}>Title</TableCell>
        <TableCell sx={{ fontWeight: 700, width: '16%' }}>Repository</TableCell>
        <TableCell sx={{ fontWeight: 700, width: '13%' }}>Author</TableCell>
        <TableCell sx={{ fontWeight: 700, width: '9%' }}>Status</TableCell>
        <TableCell sx={{ fontWeight: 700, width: '9%' }}>Created</TableCell>
        <TableCell sx={{ fontWeight: 700, width: 130 }} align="center">Info</TableCell>
          <TableCell sx={{ fontWeight: 700, width: '11%' }}>My Role</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {prs.map((pr) => (
        <TableRow key={`${pr.id}-${pr.repositoryName}`} hover>
          <TableCell sx={{ pl: 3, overflow: 'hidden' }}>
            <Link
              href={pr.url || undefined}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontWeight: 500,
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                ...(!pr.url ? { pointerEvents: 'none', color: 'text.disabled' } : {}),
              }}
              title={pr.title}
            >
              {pr.id}{': '}{pr.title}
            </Link>
          </TableCell>
          <TableCell sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" noWrap title={pr.repositoryName}>{pr.repositoryName}</Typography>
          </TableCell>
          <TableCell sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" noWrap title={pr.author}>{pr.author}</Typography>
          </TableCell>
          <TableCell><StatusChip status={pr.status} isDraft={pr.mergeInfo.draft} /></TableCell>
          <TableCell>
            <Typography variant="body2" noWrap>{new Date(pr.createdDate).toLocaleDateString()}</Typography>
          </TableCell>
          <TableCell align="center">
            <PRInfoCell
              pr={pr}
              onRefresh={onRefreshPR ? () => onRefreshPR(pr.id) : undefined}
              refreshing={refreshingPRIds.has(pr.id)}
              showRefreshButton={Boolean(onRefreshPR)}
            />
          </TableCell>
          <TableCell><ReviewerTypeChip type={pr.reviewerType} /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// ── Repo-row count chips ───────────────────────────────────────────────────
const ClickableCount: React.FC<{
  value: number;
  color: 'primary' | 'warning';
  onClick: (e: React.MouseEvent) => void;
}> = ({ value, color, onClick }) =>
  value === 0
    ? <Typography variant="body2" color="text.disabled">—</Typography>
    : <Chip label={value} size="small" color={color} variant="filled" onClick={onClick} sx={{ fontWeight: 700, minWidth: 28, cursor: 'pointer' }} />;

const StatusChip: React.FC<{ status: string; isDraft?: boolean }> = ({ status, isDraft }) => {
  if (isDraft) {
    return (
      <Chip
        label="Draft"
        size="small"
        variant="outlined"
        sx={{ color: 'primary.main', borderColor: 'primary.main', bgcolor: 'white', fontWeight: 600 }}
      />
    );
  }
  const colorMap: Record<string, 'primary' | 'success' | 'default'> = {
    active: 'primary', completed: 'success', abandoned: 'default',
  };
  return <Chip label={status} color={colorMap[status?.toLowerCase()] ?? 'default'} size="small" />;
};

const ReviewerTypeChip: React.FC<{ type: 'Required' | 'Optional' | null }> = ({ type }) =>
  type ? (
    <Chip label={type} size="small"
      color={type === 'Required' ? 'error' : 'default'}
      variant={type === 'Required' ? 'filled' : 'outlined'}
    />
  ) : null;

export default RepositoryGroupWidget;


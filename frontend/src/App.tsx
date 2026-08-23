import React, { useCallback, useEffect, useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import RateReviewIcon from '@mui/icons-material/RateReview';

import SummaryCards from './components/SummaryCards';
import MyPRsTable from './components/MyPRsTable';
import ReviewPRsTable from './components/ReviewPRsTable';
import RepositoryGroupWidget from './components/RepositoryGroupWidget';
import {
  fetchMyPullRequests,
  fetchCurrentUser,
  fetchDashboardSummary,
  fetchPullRequestById,
  fetchRepositoryGroupSummary,
  fetchReviewPullRequests,
} from './api/pullRequestApi';
import type { DashboardSummary, PullRequest, RepositoryGroupSummary, UserInfo } from './types/PullRequest';

/** Wraps a tab label with a count badge. */
const TabLabel: React.FC<{ label: string; count: number; loading: boolean; badgeColor?: 'primary' | 'warning' }> = ({
  label,
  count,
  loading,
  badgeColor = 'primary',
}) => (
  <Box display="flex" alignItems="center" gap={1.5}>
    {label}
    <Badge
      badgeContent={loading ? '…' : count}
      color={badgeColor}
      showZero
      sx={{ '& .MuiBadge-badge': { position: 'relative', transform: 'none', fontSize: '0.7rem' } }}
    />
  </Box>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [myPRs, setMyPRs] = useState<PullRequest[]>([]);
  const [reviewPRs, setReviewPRs] = useState<PullRequest[]>([]);
  const [groupSummary, setGroupSummary] = useState<RepositoryGroupSummary | null>(null);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [myLoading, setMyLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);

  const [myError, setMyError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);

  /** IDs of PRs currently being individually refreshed. */
  const [refreshingPRIds, setRefreshingPRIds] = useState<Set<number>>(new Set());

  const isAnyLoading = summaryLoading || myLoading || reviewLoading || groupLoading;

  // ── Data fetching ──────────────────────────────────────────────────────
  const loadAll = useCallback(() => {
    // Fetch user identity once — skip if already loaded
    if (!currentUser) {
      fetchCurrentUser()
        .then(setCurrentUser)
        .catch((err) => console.error('User fetch failed:', err));
    }

    setSummaryLoading(true);
    fetchDashboardSummary()
      .then(setSummary)
      .catch((err) => console.error('Summary fetch failed:', err))
      .finally(() => setSummaryLoading(false));

    setMyLoading(true);
    setMyError(null);
    fetchMyPullRequests()
      .then(setMyPRs)
      .catch((err) => {
        console.error('My PRs fetch failed:', err);
        setMyError('Failed to load your pull requests.');
      })
      .finally(() => setMyLoading(false));

    setReviewLoading(true);
    setReviewError(null);
    fetchReviewPullRequests()
      .then(setReviewPRs)
      .catch((err) => {
        console.error('Review PRs fetch failed:', err);
        setReviewError('Failed to load pull requests awaiting review.');
      })
      .finally(() => setReviewLoading(false));

    setGroupLoading(true);
    setGroupError(null);
    fetchRepositoryGroupSummary()
      .then(setGroupSummary)
      .catch((err) => {
        console.error('Repository group fetch failed:', err);
        setGroupError('Failed to load repository group summary.');
      })
      .finally(() => setGroupLoading(false));
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /**
   * Refreshes a single PR by ID without touching the rest of the dashboard.
   * Updates whichever list(s) contain that PR.
   */
  const refreshSinglePR = useCallback(async (id: number) => {
    setRefreshingPRIds((prev) => new Set(prev).add(id));
    try {
      const updated = await fetchPullRequestById(id);
      setMyPRs((prev) => prev.map((pr) => pr.id === id ? updated : pr));
      setReviewPRs((prev) => prev.map((pr) => pr.id === id ? updated : pr));
    } catch (err) {
      console.error(`Failed to refresh PR #${id}:`, err);
    } finally {
      setRefreshingPRIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f5f6fa' }}>
      {/* Top AppBar */}
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Azure DevOps Dashboard
          </Typography>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={isAnyLoading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={loadAll}
            disabled={isAnyLoading}
          >
            {isAnyLoading ? 'Refreshing…' : 'Refresh'}
          </Button>

          {/* Current user */}
          {currentUser && (
            <Tooltip title={currentUser.displayName}>
              <Box display="flex" alignItems="center" gap={1} ml={2}>
                <Avatar sx={{ width: 30, height: 30, fontSize: '0.85rem', bgcolor: 'primary.light' }}>
                  {currentUser.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </Avatar>
                <Typography variant="body2" color="inherit" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {currentUser.displayName}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 4, flexGrow: 1 }}>
        {/* Summary cards */}
        <SummaryCards summary={summary} loading={summaryLoading} />

        <Divider sx={{ my: 3 }} />

        {/* Repository group widget */}
        <Typography variant="subtitle1" fontWeight={700} mb={1.5} color="text.secondary">
          Repository Groups
        </Typography>
        <RepositoryGroupWidget
          summary={groupSummary}
          loading={groupLoading}
          error={groupError}
          myPRs={myPRs}
          reviewPRs={reviewPRs}
          onRefreshPR={refreshSinglePR}
          refreshingPRIds={refreshingPRIds}
        />

        <Divider sx={{ my: 3 }} />

        {/* Tabs */}
        <Box sx={{ bgcolor: 'white', borderRadius: 1, boxShadow: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            textColor="inherit"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              px: 2,
              '& .MuiTabs-indicator': {
                backgroundColor: activeTab === 1 ? 'warning.main' : 'primary.main',
              },
            }}
          >
            <Tab
              icon={<AssignmentIndIcon fontSize="small" />}
              iconPosition="start"
              label={
                <TabLabel
                  label="My Pull Requests"
                  count={myPRs.length}
                  loading={myLoading}
                  badgeColor="primary"
                />
              }
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 56,
                color: 'text.secondary',
                '&.Mui-selected': { color: 'primary.main' },
              }}
            />
            <Tab
              icon={<RateReviewIcon fontSize="small" />}
              iconPosition="start"
              label={
                <TabLabel
                  label="Awaiting My Review"
                  count={reviewPRs.length}
                  loading={reviewLoading}
                  badgeColor="warning"
                />
              }
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 56,
                color: 'text.secondary',
                '&.Mui-selected': { color: 'warning.main' },
              }}
            />
          </Tabs>

          {/* Tab panels */}
          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <MyPRsTable
                pullRequests={myPRs}
                loading={myLoading}
                error={myError}
                onRefreshPR={refreshSinglePR}
                refreshingPRIds={refreshingPRIds}
              />
            )}
            {activeTab === 1 && (
              <ReviewPRsTable
                pullRequests={reviewPRs}
                loading={reviewLoading}
                error={reviewError}
                onRefreshPR={refreshSinglePR}
                refreshingPRIds={refreshingPRIds}
              />
            )}
          </Box>
        </Box>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{ py: 2, textAlign: 'center', bgcolor: 'white', borderTop: '1px solid #e0e0e0' }}
      >
        <Typography variant="caption" color="text.secondary">
          Azure DevOps Personal Dashboard · Phase 1
        </Typography>
      </Box>
    </Box>
  );
};

export default App;


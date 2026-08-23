import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RateReviewIcon from '@mui/icons-material/RateReview';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { DashboardSummary } from '../types/PullRequest';

interface SummaryCardsProps {
  summary: DashboardSummary | null;
  loading: boolean;
}

/**
 * SummaryCards – displays three stat cards at the top of the dashboard:
 *   1. Number of PRs assigned to me
 *   2. Number of PRs awaiting my review
 *   3. Last refresh timestamp
 */
const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, loading }) => {
  const lastRefreshed = summary?.lastRefreshed
    ? new Date(summary.lastRefreshed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';
  const lastRefreshedDate = summary?.lastRefreshed
    ? new Date(summary.lastRefreshed).toLocaleDateString()
    : '';

  return (
    <Grid container spacing={3} sx={{ mb: 4 }} alignItems="stretch">
      {/* My Pull Requests */}
      <Grid item xs={12} sm={4} sx={{ display: 'flex' }}>
        <Card elevation={3} sx={{ width: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <AssignmentIcon color="primary" />
              <Typography variant="subtitle2" color="text.secondary">
                My Pull Requests
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={700} color="primary">
              {loading ? '…' : (summary?.myCount ?? 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Created by me
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Awaiting Review */}
      <Grid item xs={12} sm={4} sx={{ display: 'flex' }}>
        <Card elevation={3} sx={{ width: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <RateReviewIcon color="warning" />
              <Typography variant="subtitle2" color="text.secondary">
                Awaiting My Review
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={700} color="warning.main">
              {loading ? '…' : (summary?.reviewCount ?? 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              I am a reviewer
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Last Refreshed */}
      <Grid item xs={12} sm={4} sx={{ display: 'flex' }}>
        <Card elevation={3} sx={{ width: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <AccessTimeIcon color="action" />
              <Typography variant="subtitle2" color="text.secondary">
                Last Refreshed
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={700} color="text.secondary">
              {loading ? '…' : lastRefreshed}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {loading ? '' : lastRefreshedDate}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default SummaryCards;

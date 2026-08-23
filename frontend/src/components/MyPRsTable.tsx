import React from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from '@mui/material';import type { PullRequest } from '../types/PullRequest';
import { usePRFilter, type SortField } from '../hooks/usePRFilter';
import PRFilterBar from './PRFilterBar';
import PRInfoCell from './PRInfoCell';

interface MyPRsTableProps {
  pullRequests: PullRequest[];
  loading: boolean;
  error: string | null;
  onRefreshPR: (id: number) => void;
  refreshingPRIds: Set<number>;
}

/**
 * MyPRsTable – pull requests created by the current user.
 * Columns: Repository | Title | Status | Created | Link
 * Filtering: text search, group multi-select, repo multi-select.
 * Sorting: click any column header.
 */
const MyPRsTable: React.FC<MyPRsTableProps> = ({ pullRequests, loading, error, onRefreshPR, refreshingPRIds }) => {
  const {
    filtered,
    repositories,
    groups,
    filterState,
    setSearchText,
    setRepoFilter,
    setGroupFilter,
    handleColumnSort,
  } = usePRFilter(pullRequests, 'createdDate');

  const { searchText, repoFilter, groupFilter, sortBy, sortDir } = filterState;

  const sortProps = (col: SortField) => ({
    active: sortBy === col,
    direction: sortBy === col ? sortDir : 'asc' as const,
    onClick: () => handleColumnSort(col),
  });

  return (
    <Box>
      {/* Loading state */}
      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Error state */}
      {!loading && error && <Alert severity="error">{error}</Alert>}

      {/* Filter bar — only shown when there is data */}
      {!loading && !error && (
        <PRFilterBar
          searchText={searchText}
          onSearchTextChange={setSearchText}
          repoFilter={repoFilter}
          onRepoFilterChange={setRepoFilter}
          repositories={repositories}
          groupFilter={groupFilter}
          onGroupFilterChange={setGroupFilter}
          groups={groups}
          resultCount={filtered.length}
          totalCount={pullRequests.length}
        />
      )}

      {/* Empty state */}
      {!loading && !error && pullRequests.length === 0 && (
        <Alert severity="info">No pull requests created by you.</Alert>
      )}

      {/* No filter results */}
      {!loading && !error && pullRequests.length > 0 && filtered.length === 0 && (
        <Alert severity="warning">No pull requests match your filter criteria.</Alert>
      )}

      {/* Data table */}
      {!loading && !error && filtered.length > 0 && (
        <TableContainer component={Paper} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>
                  <TableSortLabel sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }} {...sortProps('repositoryName')}>
                    Repository
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>
                  <TableSortLabel sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }} {...sortProps('title')}>
                    Title
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>
                  <TableSortLabel sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }} {...sortProps('status')}>
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>
                  <TableSortLabel sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }} {...sortProps('createdDate')}>
                    Created
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Link</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>My Role</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Info</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((pr) => (
                <TableRow key={pr.id} hover>
                  <TableCell>{pr.repositoryName}</TableCell>
                  <TableCell>{pr.title}</TableCell>
                  <TableCell>
                    <StatusChip status={pr.status} isDraft={pr.mergeInfo.draft} />
                  </TableCell>
                  <TableCell>{new Date(pr.createdDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Link
                      href={pr.url || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={pr.url ? {} : { pointerEvents: 'none', color: 'text.disabled' }}
                    >
                      View PR #{pr.id}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ReviewerTypeChip type={pr.reviewerType} />
                  </TableCell>
                  <TableCell align="center">
                    <PRInfoCell
                      pr={pr}
                      onRefresh={() => onRefreshPR(pr.id)}
                      refreshing={refreshingPRIds.has(pr.id)}
                      showRefreshButton
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

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
  const colorMap: Record<string, 'primary' | 'success' | 'default' | 'warning'> = {
    active: 'primary',
    completed: 'success',
    abandoned: 'default',
  };
  const color = colorMap[status.toLowerCase()] ?? 'default';
  return <Chip label={status} color={color} size="small" />;
};

const ReviewerTypeChip: React.FC<{ type: 'Required' | 'Optional' | null }> = ({ type }) =>
  type ? (
    <Chip
      label={type}
      size="small"
      color={type === 'Required' ? 'error' : 'default'}
      variant={type === 'Required' ? 'filled' : 'outlined'}
    />
  ) : null;

export default MyPRsTable;


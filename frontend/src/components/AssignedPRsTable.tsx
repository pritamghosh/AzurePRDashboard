import React from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { PullRequest } from '../types/PullRequest';
import { usePRFilter, type SortField } from '../hooks/usePRFilter';
import PRFilterBar from './PRFilterBar';
import PRMergeStatusBadge from './PRMergeStatusBadge';

interface AssignedPRsTableProps {
  pullRequests: PullRequest[];
  loading: boolean;
  error: string | null;
  onRefreshPR: (id: number) => void;
  refreshingPRIds: Set<number>;
}

/**
 * AssignedPRsTable – pull requests created by the current user.
 * Columns: Repository | Title | Status | Created | Link
 * Filtering: text search, group multi-select, repo multi-select.
 * Sorting: click any column header.
 */
const AssignedPRsTable: React.FC<AssignedPRsTableProps> = ({ pullRequests, loading, error, onRefreshPR, refreshingPRIds }) => {
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
                <TableCell sx={{ color: 'white', fontWeight: 700, width: 48 }} align="center">Info</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, width: 48 }} align="center"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((pr) => (
                <TableRow key={pr.id} hover>
                  <TableCell>{pr.repositoryName}</TableCell>
                  <TableCell>{pr.title}</TableCell>
                  <TableCell>
                    <StatusChip status={pr.status} />
                  </TableCell>
                  <TableCell>{new Date(pr.createdDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Link
                      href={pr.url || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={!pr.url ? { pointerEvents: 'none', color: 'text.disabled' } : {}}
                    >
                      {pr.id}
                    </Link>
                  </TableCell>
                  <TableCell align="center">
                    <PRMergeStatusBadge
                      mergeInfo={pr.mergeInfo}
                      prId={pr.id}
                      onRefresh={() => onRefreshPR(pr.id)}
                      refreshing={refreshingPRIds.has(pr.id)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Refresh this PR">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => onRefreshPR(pr.id)}
                          disabled={refreshingPRIds.has(pr.id)}
                          sx={{ p: 0.25 }}
                        >
                          {refreshingPRIds.has(pr.id)
                            ? <CircularProgress size={16} />
                            : <RefreshIcon sx={{ fontSize: 16 }} />}
                        </IconButton>
                      </span>
                    </Tooltip>
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

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const colorMap: Record<string, 'primary' | 'success' | 'default' | 'warning'> = {
    active: 'primary',
    completed: 'success',
    abandoned: 'default',
  };
  const color = colorMap[status.toLowerCase()] ?? 'default';
  return <Chip label={status} color={color} size="small" />;
};

export default AssignedPRsTable;


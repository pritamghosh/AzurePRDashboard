import React from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { SortField } from '../hooks/usePRFilter';

export interface SortOption {
  value: SortField;
  label: string;
}

interface PRFilterBarProps {
  searchText: string;
  onSearchTextChange: (v: string) => void;

  repoFilter: string[];
  onRepoFilterChange: (v: string[]) => void;
  repositories: string[];

  groupFilter: string[];
  onGroupFilterChange: (v: string[]) => void;
  groups: string[];


  resultCount: number;
  totalCount: number;
}

/**
 * PRFilterBar – shared filter toolbar above each PR table.
 *
 * Controls:
 *  • Text search        → filters title, repository, author
 *  • Group multi-select → narrows by one or more configured groups
 *  • Repo multi-select  → narrows by one or more repositories
 *
 * Sorting is handled by clicking column headers in the table (TableSortLabel).
 */
const PRFilterBar: React.FC<PRFilterBarProps> = ({
  searchText,
  onSearchTextChange,
  repoFilter,
  onRepoFilterChange,
  repositories,
  groupFilter,
  onGroupFilterChange,
  groups,
  resultCount,
  totalCount,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'flex-start',
        mb: 2,
        p: 2,
        bgcolor: 'grey.50',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'grey.200',
      }}
    >
      {/* Text search */}
      <TextField
        size="small"
        placeholder="Search title, repo, author…"
        value={searchText}
        onChange={(e) => onSearchTextChange(e.target.value)}
        sx={{ minWidth: 220, flex: '0 0 auto' }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          },
        }}
      />

      {/* Group multi-select */}
      <Autocomplete
        multiple
        size="small"
        options={groups}
        value={groupFilter}
        onChange={(_, v) => onGroupFilterChange(v)}
        disableCloseOnSelect
        sx={{ minWidth: 220, flex: '1 1 220px' }}
        renderInput={(params) => (
          <TextField {...params} label="Groups" placeholder={groupFilter.length === 0 ? 'All groups' : ''} />
        )}
        renderTags={(selected, getTagProps) =>
          selected.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option}
              label={option}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))
        }
      />

      {/* Repository multi-select */}
      <Autocomplete
        multiple
        size="small"
        options={repositories}
        value={repoFilter}
        onChange={(_, v) => onRepoFilterChange(v)}
        disableCloseOnSelect
        sx={{ minWidth: 220, flex: '1 1 220px' }}
        renderInput={(params) => (
          <TextField {...params} label="Repositories" placeholder={repoFilter.length === 0 ? 'All repositories' : ''} />
        )}
        renderTags={(selected, getTagProps) =>
          selected.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option}
              label={option}
              size="small"
              variant="outlined"
            />
          ))
        }
      />

      {/* Result count */}
      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {(() => {
            const noun = totalCount === 1 ? 'pull request' : 'pull requests';
            return resultCount === totalCount
              ? `${totalCount} ${noun}`
              : `${resultCount} of ${totalCount} ${noun}`;
          })()}
        </Typography>
      </Box>
    </Box>
  );
};

export default PRFilterBar;


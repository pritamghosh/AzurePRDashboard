import { useMemo, useState } from 'react';
import type { PullRequest } from '../types/PullRequest';

export type SortField = 'title' | 'repositoryName' | 'author' | 'createdDate' | 'status';
export type SortDir = 'asc' | 'desc';

export interface PRFilterState {
  searchText: string;
  /** Multi-select: empty array = no filter (show all repos). */
  repoFilter: string[];
  /** Multi-select: empty array = no filter (show all groups). */
  groupFilter: string[];
  sortBy: SortField;
  sortDir: SortDir;
}

export interface UsePRFilterReturn {
  filtered: PullRequest[];
  repositories: string[];
  groups: string[];
  filterState: PRFilterState;
  setSearchText: (v: string) => void;
  setRepoFilter: (v: string[]) => void;
  setGroupFilter: (v: string[]) => void;
  setSortBy: (v: SortField) => void;
  toggleSortDir: () => void;
  handleColumnSort: (col: SortField) => void;
}

/**
 * Encapsulates all filter + sort logic for a PR list.
 * Used by both AssignedPRsTable and ReviewPRsTable.
 *
 * Filters:
 *  - searchText  : case-insensitive contains across title / repo / author
 *  - repoFilter  : multi-select — show only selected repositories (empty = all)
 *  - groupFilter : multi-select — show only selected groups       (empty = all)
 */
export function usePRFilter(
  pullRequests: PullRequest[],
  defaultSort: SortField = 'createdDate',
): UsePRFilterReturn {
  const [searchText, setSearchText] = useState('');
  const [repoFilter, setRepoFilter] = useState<string[]>([]);
  const [groupFilter, setGroupFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortField>(defaultSort);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  /** Unique repository names, sorted alphabetically. */
  const repositories = useMemo(
    () => [...new Set(pullRequests.map((pr) => pr.repositoryName))].sort(),
    [pullRequests],
  );

  /** Unique group names, sorted alphabetically. */
  const groups = useMemo(
    () => [...new Set(pullRequests.map((pr) => pr.group ?? 'Other'))].sort(),
    [pullRequests],
  );

  const filtered = useMemo(() => {
    const lower = searchText.toLowerCase();

    return pullRequests
      .filter((pr) => {
        const matchesText =
          !lower ||
          pr.title.toLowerCase().includes(lower) ||
          pr.repositoryName.toLowerCase().includes(lower) ||
          pr.author.toLowerCase().includes(lower);

        const matchesRepo =
          repoFilter.length === 0 || repoFilter.includes(pr.repositoryName);

        const matchesGroup =
          groupFilter.length === 0 || groupFilter.includes(pr.group ?? 'Other');

        return matchesText && matchesRepo && matchesGroup;
      })
      .sort((a, b) => {
        if (sortBy === 'createdDate') {
          const diff =
            new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
          return sortDir === 'asc' ? diff : -diff;
        }
        const cmp = String(a[sortBy] ?? '').localeCompare(
          String(b[sortBy] ?? ''),
          undefined,
          { sensitivity: 'base' },
        );
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [pullRequests, searchText, repoFilter, groupFilter, sortBy, sortDir]);

  const handleColumnSort = (col: SortField) => {
    if (col === sortBy) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const toggleSortDir = () => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));

  return {
    filtered,
    repositories,
    groups,
    filterState: { searchText, repoFilter, groupFilter, sortBy, sortDir },
    setSearchText,
    setRepoFilter,
    setGroupFilter,
    setSortBy,
    toggleSortDir,
    handleColumnSort,
  };
}

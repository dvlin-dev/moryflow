/**
 * [PROVIDES]: 分页列表查询编排 hook（search/page/filter）
 * [DEPENDS]: React useState
 * [POS]: 供 admin 列表页面复用，避免重复查询编排逻辑
 */

import { useState } from 'react';

type SearchValue = string | undefined;

export interface PagedSearchQuery {
  page?: number;
  limit?: number;
  search?: SearchValue;
}

export interface UsePagedSearchQueryOptions<TQuery extends PagedSearchQuery> {
  initialQuery: TQuery;
  initialSearchInput?: string;
}

export interface UsePagedSearchQueryResult<TQuery extends PagedSearchQuery> {
  query: TQuery;
  setQuery: React.Dispatch<React.SetStateAction<TQuery>>;
  searchInput: string;
  setSearchInput: React.Dispatch<React.SetStateAction<string>>;
  handleSearch: () => void;
  handleSearchKeyDown: (event: React.KeyboardEvent) => void;
  handlePageChange: (page: number) => void;
  setQueryFilter: <K extends keyof TQuery>(key: K, value: TQuery[K] | undefined) => void;
}

export function usePagedSearchQuery<TQuery extends PagedSearchQuery>({
  initialQuery,
  initialSearchInput = '',
}: UsePagedSearchQueryOptions<TQuery>): UsePagedSearchQueryResult<TQuery> {
  const [query, setQuery] = useState<TQuery>(initialQuery);
  const [searchInput, setSearchInput] = useState(initialSearchInput);

  const handleSearch = () => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: (searchInput || undefined) as TQuery['search'],
    }));
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  const setQueryFilter = <K extends keyof TQuery>(key: K, value: TQuery[K] | undefined) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      [key]: value,
    }));
  };

  return {
    query,
    setQuery,
    searchInput,
    setSearchInput,
    handleSearch,
    handleSearchKeyDown,
    handlePageChange,
    setQueryFilter,
  };
}

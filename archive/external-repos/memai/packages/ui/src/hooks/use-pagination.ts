import { useState, useCallback, useMemo } from 'react';

interface UsePaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPage: () => void;
  getTotalPages: (totalItems: number) => number;
  getOffset: () => number;
}

/**
 * 分页 Hook
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const { pageSize = 10, initialPage = 1 } = options;
  const [page, setPageState] = useState(initialPage);

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage));
  }, []);

  const nextPage = useCallback(() => {
    setPageState((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPageState((prev) => Math.max(1, prev - 1));
  }, []);

  const resetPage = useCallback(() => {
    setPageState(initialPage);
  }, [initialPage]);

  const getTotalPages = useCallback(
    (totalItems: number) => Math.ceil(totalItems / pageSize),
    [pageSize],
  );

  const getOffset = useCallback(() => (page - 1) * pageSize, [page, pageSize]);

  return useMemo(
    () => ({
      page,
      pageSize,
      setPage,
      nextPage,
      prevPage,
      resetPage,
      getTotalPages,
      getOffset,
    }),
    [page, pageSize, setPage, nextPage, prevPage, resetPage, getTotalPages, getOffset],
  );
}

/**
 * 分页 Hook
 */
import { useState, useCallback, useMemo } from 'react'

export interface UsePaginationOptions {
  pageSize?: number
  initialPage?: number
}

export interface UsePaginationReturn {
  page: number
  pageSize: number
  offset: number
  setPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  resetPage: () => void
  getTotalPages: (totalCount: number) => number
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const { pageSize = 20, initialPage = 1 } = options
  const [page, setPageState] = useState(initialPage)

  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize])

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage))
  }, [])

  const nextPage = useCallback(() => {
    setPageState((p) => p + 1)
  }, [])

  const prevPage = useCallback(() => {
    setPageState((p) => Math.max(1, p - 1))
  }, [])

  const resetPage = useCallback(() => {
    setPageState(initialPage)
  }, [initialPage])

  const getTotalPages = useCallback(
    (totalCount: number) => Math.ceil(totalCount / pageSize),
    [pageSize]
  )

  return {
    page,
    pageSize,
    offset,
    setPage,
    nextPage,
    prevPage,
    resetPage,
    getTotalPages,
  }
}

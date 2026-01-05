/**
 * SimplePagination - 简化分页组件
 */
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../primitives/pagination'

export interface SimplePaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  maxVisiblePages?: number
}

export function SimplePagination({
  page,
  totalPages,
  onPageChange,
  maxVisiblePages = 5,
}: SimplePaginationProps) {
  if (totalPages <= 1) return null

  const visiblePages = Math.min(maxVisiblePages, totalPages)

  // 计算起始页码
  let startPage = Math.max(1, page - Math.floor(visiblePages / 2))
  const endPage = Math.min(totalPages, startPage + visiblePages - 1)
  startPage = Math.max(1, endPage - visiblePages + 1)

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
        {Array.from({ length: endPage - startPage + 1 }, (_, i) => {
          const pageNum = startPage + i
          return (
            <PaginationItem key={pageNum}>
              <PaginationLink
                onClick={() => onPageChange(pageNum)}
                isActive={page === pageNum}
                className="cursor-pointer"
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          )
        })}
        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

/**
 * 表格骨架屏组件
 */
import { TableRow, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

export interface ColumnConfig {
  width: string
}

interface TableSkeletonProps {
  columns: ColumnConfig[]
  rows?: number
}

export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {columns.map((col, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className={`h-4 ${col.width}`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

/**
 * [PROPS]: rows / rowClassName
 * [EMITS]: none
 * [POS]: 列表 loading 状态片段（骨架行）
 */

import { Skeleton } from '@moryflow/ui';

export interface ListLoadingRowsProps {
  rows?: number;
  rowClassName?: string;
  containerClassName?: string;
}

export function ListLoadingRows({
  rows = 5,
  rowClassName = 'h-12 w-full',
  containerClassName = 'space-y-3',
}: ListLoadingRowsProps) {
  return (
    <div className={containerClassName}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className={rowClassName} />
      ))}
    </div>
  );
}

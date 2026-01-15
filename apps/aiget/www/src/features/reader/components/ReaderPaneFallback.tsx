/**
 * [PROPS]: variant
 * [POS]: Reader 懒加载视图的占位（Notion 风格：克制、无跳动）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import { Skeleton } from '@aiget/ui';

interface ReaderPaneFallbackProps {
  variant: 'list' | 'detail';
}

export function ReaderPaneFallback({ variant }: ReaderPaneFallbackProps) {
  if (variant === 'detail') {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <Skeleton className="h-4 w-1/2" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        </div>
        <div className="flex-1 space-y-3 p-6">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
      <div className="space-y-2 p-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-md border border-border p-3">
            <Skeleton className="mb-2 h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

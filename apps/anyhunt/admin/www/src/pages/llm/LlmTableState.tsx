/**
 * [PROPS]: isLoading/errorMessage/children
 * [EMITS]: none
 * [POS]: LLM 表格卡片通用状态片段
 */

import type { ReactNode } from 'react';
import { Skeleton } from '@moryflow/ui';

export interface LlmTableStateProps {
  isLoading: boolean;
  errorMessage?: string | null;
  children: ReactNode;
}

export function LlmTableState({ isLoading, errorMessage, children }: LlmTableStateProps) {
  return (
    <>
      {errorMessage ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}
      {isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {!isLoading ? children : null}
    </>
  );
}

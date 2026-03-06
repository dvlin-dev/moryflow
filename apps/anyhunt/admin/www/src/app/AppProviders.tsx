/**
 * [PROPS]: children
 * [EMITS]: none
 * [POS]: Admin 应用级 Providers（React Query + Toaster）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './query-client';

export interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}

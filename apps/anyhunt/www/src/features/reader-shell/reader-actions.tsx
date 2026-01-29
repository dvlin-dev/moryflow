/**
 * [PROVIDES]: Reader 内部操作入口（创建订阅/设置/发布）
 * [DEPENDS]: none
 * [POS]: Reader Shell 子组件的动作共享上下文
 * [UPDATE]: 2026-01-28 支持订阅设置默认 Tab 与直接发布
 */

import { createContext, useContext } from 'react';
import type { Subscription } from '@/features/digest/types';

interface ReaderActionsContextValue {
  openCreateSubscription: (initialTopic?: string) => void;
  openSubscriptionSettings: (
    subscription: Subscription,
    tab?: 'basic' | 'history' | 'suggestions' | 'notifications'
  ) => void;
  openPublishTopic: (subscription?: Subscription) => void;
}

const ReaderActionsContext = createContext<ReaderActionsContextValue | null>(null);

export const ReaderActionsProvider = ReaderActionsContext.Provider;

export function useReaderActions() {
  const context = useContext(ReaderActionsContext);
  if (!context) {
    throw new Error('useReaderActions must be used within <ReaderActionsProvider>');
  }
  return context;
}

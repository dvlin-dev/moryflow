/**
 * [PROVIDES]: ConversationViewportContext - ConversationViewport 状态上下文
 * [DEPENDS]: React + zustand
 * [POS]: ConversationViewport 状态注入与访问入口（isAtBottom/distanceFromBottom/navigateToLatest/preserveAnchor）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import type { UseBoundStore, StoreApi } from 'zustand';

import type { ConversationViewportState } from './store';
import { makeConversationViewportStore } from './store';

export type ConversationViewportStore = UseBoundStore<StoreApi<ConversationViewportState>>;

export type ConversationViewportProviderProps = {
  children: ReactNode;
};

export const ConversationViewportContext = createContext<ConversationViewportStore | null>(null);

export const ConversationViewportProvider = ({ children }: ConversationViewportProviderProps) => {
  const [store] = useState(() => makeConversationViewportStore());
  return (
    <ConversationViewportContext.Provider value={store}>
      {children}
    </ConversationViewportContext.Provider>
  );
};

export const useConversationViewportStore = () => {
  const store = useContext(ConversationViewportContext);
  if (!store) {
    throw new Error(
      'useConversationViewportStore must be used within <ConversationViewportProvider>'
    );
  }
  return store;
};

export const useOptionalConversationViewportStore = () => {
  return useContext(ConversationViewportContext);
};

export const useConversationViewport = <TSelected,>(
  selector: (state: ConversationViewportState) => TSelected
) => {
  const store = useConversationViewportStore();
  return store(selector);
};

export const useConversationViewportController = () => {
  const store = useOptionalConversationViewportStore();

  return {
    navigateToLatest: (config?: { behavior?: ScrollBehavior | undefined }) => {
      store?.getState().navigateToLatest(config);
    },
    preserveAnchor: (anchorId: string) => {
      store?.getState().preserveAnchor(anchorId);
    },
  };
};

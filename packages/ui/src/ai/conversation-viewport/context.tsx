/**
 * [PROVIDES]: ConversationViewportContext - ConversationViewport 状态上下文
 * [DEPENDS]: React + zustand
 * [POS]: ConversationViewport 状态注入与访问入口（isAtBottom/distanceFromBottom/scrollToBottom）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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

export const useConversationViewport = <TSelected,>(
  selector: (state: ConversationViewportState) => TSelected
) => {
  const store = useConversationViewportStore();
  return store(selector);
};

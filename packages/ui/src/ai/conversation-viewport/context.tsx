/**
 * [PROVIDES]: ConversationViewportContext - Store Provider 与 Hook
 * [DEPENDS]: React, zustand
 * [POS]: Conversation Viewport 状态注入与访问入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { createContext, useContext, useRef } from 'react';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';

import type { ConversationViewportState } from './store';
import { createConversationViewportStore } from './store';

export type ConversationViewportProviderProps = {
  children: ReactNode;
};

const ConversationViewportContext = createContext<StoreApi<ConversationViewportState> | null>(null);

export const ConversationViewportProvider = ({ children }: ConversationViewportProviderProps) => {
  const storeRef = useRef<StoreApi<ConversationViewportState> | null>(null);

  if (!storeRef.current) {
    storeRef.current = createConversationViewportStore();
  }

  return (
    <ConversationViewportContext.Provider value={storeRef.current}>
      {children}
    </ConversationViewportContext.Provider>
  );
};

export const useConversationViewportStore = () => {
  const store = useContext(ConversationViewportContext);
  if (!store) {
    throw new Error('ConversationViewport is missing in the component tree.');
  }
  return store;
};

export const useConversationViewport = <T,>(selector: (state: ConversationViewportState) => T) => {
  const store = useConversationViewportStore();
  return useStore(store, selector);
};

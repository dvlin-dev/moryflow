/**
 * [PROVIDES]: useMemoryWorkbenchStore - Memory Workbench 跨入口意图状态
 * [DEPENDS]: zustand
 * [POS]: 协调 Memory 模块内 tab/选中项，与 Global Search 的打开动作打通
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { create } from 'zustand';

export type MemoryWorkbenchTab = 'overview' | 'search' | 'facts' | 'graph' | 'exports';
export type MemoryWorkbenchIntent<T> = {
  scopeKey: string;
  value: T;
};

type MemoryWorkbenchState = {
  activeTab: MemoryWorkbenchTab;
  pendingFactIntent: MemoryWorkbenchIntent<string> | null;
  pendingSearchIntent: MemoryWorkbenchIntent<string> | null;
  setActiveTab: (tab: MemoryWorkbenchTab) => void;
  openFact: (factId: string, scopeKey: string) => void;
  seedSearch: (query: string | null, scopeKey: string) => void;
  clearPendingFact: () => void;
  clearPendingSearchQuery: () => void;
};

const createInitialState = (): Pick<
  MemoryWorkbenchState,
  'activeTab' | 'pendingFactIntent' | 'pendingSearchIntent'
> => ({
  activeTab: 'overview',
  pendingFactIntent: null,
  pendingSearchIntent: null,
});

export const useMemoryWorkbenchStore = create<MemoryWorkbenchState>((set) => ({
  ...createInitialState(),
  setActiveTab: (tab) => set({ activeTab: tab }),
  openFact: (factId, scopeKey) =>
    set({
      activeTab: 'facts',
      pendingFactIntent: {
        scopeKey,
        value: factId,
      },
    }),
  seedSearch: (query, scopeKey) =>
    set({
      activeTab: 'search',
      pendingSearchIntent: query?.trim()
        ? {
            scopeKey,
            value: query.trim(),
          }
        : null,
    }),
  clearPendingFact: () => set({ pendingFactIntent: null }),
  clearPendingSearchQuery: () => set({ pendingSearchIntent: null }),
}));

export const resetMemoryWorkbenchStore = () => {
  useMemoryWorkbenchStore.setState(createInitialState());
};

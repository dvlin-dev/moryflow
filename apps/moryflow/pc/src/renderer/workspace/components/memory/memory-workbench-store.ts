/**
 * [PROVIDES]: useMemoryWorkbenchStore - Memory Workbench 跨入口意图状态
 * [DEPENDS]: zustand
 * [POS]: 协调 Memory 模块内 tab/选中项，与 Global Search 的打开动作打通
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { create } from 'zustand';

export type MemoryWorkbenchTab = 'overview' | 'search' | 'facts' | 'graph' | 'exports';

type MemoryWorkbenchState = {
  activeTab: MemoryWorkbenchTab;
  pendingFactId: string | null;
  pendingSearchQuery: string | null;
  setActiveTab: (tab: MemoryWorkbenchTab) => void;
  openFact: (factId: string) => void;
  seedSearch: (query: string | null) => void;
  clearPendingFact: () => void;
  clearPendingSearchQuery: () => void;
};

const createInitialState = (): Pick<
  MemoryWorkbenchState,
  'activeTab' | 'pendingFactId' | 'pendingSearchQuery'
> => ({
  activeTab: 'overview',
  pendingFactId: null,
  pendingSearchQuery: null,
});

export const useMemoryWorkbenchStore = create<MemoryWorkbenchState>((set) => ({
  ...createInitialState(),
  setActiveTab: (tab) => set({ activeTab: tab }),
  openFact: (factId) =>
    set({
      activeTab: 'facts',
      pendingFactId: factId,
    }),
  seedSearch: (query) =>
    set({
      activeTab: 'search',
      pendingSearchQuery: query?.trim() ? query.trim() : null,
    }),
  clearPendingFact: () => set({ pendingFactId: null }),
  clearPendingSearchQuery: () => set({ pendingSearchQuery: null }),
}));

export const resetMemoryWorkbenchStore = () => {
  useMemoryWorkbenchStore.setState(createInitialState());
};

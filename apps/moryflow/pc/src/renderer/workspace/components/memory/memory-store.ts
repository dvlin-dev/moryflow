import { create } from 'zustand';

export type MemoryDetailView = 'none' | 'memories' | 'knowledge' | 'connections' | 'search';

interface MemoryStore {
  detailView: MemoryDetailView;
  openDetail: (view: MemoryDetailView) => void;
  closeDetail: () => void;
  selectedFactId: string | null;
  selectFact: (id: string | null) => void;
  pendingFactIntent: { scopeKey: string; factId: string } | null;
  openFactFromSearch: (factId: string, scopeKey: string) => void;
  clearPendingFactIntent: () => void;
}

export const useMemoryStore = create<MemoryStore>((set) => ({
  detailView: 'none',
  openDetail: (view) => set({ detailView: view }),
  closeDetail: () => set({ detailView: 'none', selectedFactId: null }),
  selectedFactId: null,
  selectFact: (id) => set({ selectedFactId: id }),
  pendingFactIntent: null,
  openFactFromSearch: (factId, scopeKey) =>
    set({
      pendingFactIntent: { scopeKey, factId },
      detailView: 'memories',
      selectedFactId: factId,
    }),
  clearPendingFactIntent: () => set({ pendingFactIntent: null }),
}));

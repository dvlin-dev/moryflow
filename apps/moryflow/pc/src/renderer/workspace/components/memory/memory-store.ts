import { create } from 'zustand';
import type {
  MemoryOverview,
  MemoryFact,
  MemoryGraphEntity,
  MemoryGraphRelation,
} from '@shared/ipc';

export type MemoryDetailView = 'none' | 'memories' | 'knowledge' | 'connections';

export interface MemoryDataCache {
  scopeKey: string | undefined;
  overview: MemoryOverview | null;
  personalFacts: MemoryFact[];
  personalFactsHasMore: boolean;
  knowledgeFacts: MemoryFact[];
  graphEntities: MemoryGraphEntity[];
  graphRelations: MemoryGraphRelation[];
}

interface MemoryStore {
  detailView: MemoryDetailView;
  openDetail: (view: MemoryDetailView) => void;
  closeDetail: () => void;
  selectedFactId: string | null;
  selectFact: (id: string | null) => void;
  pendingFactIntent: { scopeKey: string; factId: string } | null;
  openFactFromSearch: (factId: string, scopeKey: string) => void;
  clearPendingFactIntent: () => void;
  dataCache: MemoryDataCache;
  setDataCache: (patch: Partial<MemoryDataCache>) => void;
}

const EMPTY_CACHE: MemoryDataCache = {
  scopeKey: undefined,
  overview: null,
  personalFacts: [],
  personalFactsHasMore: false,
  knowledgeFacts: [],
  graphEntities: [],
  graphRelations: [],
};

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
  dataCache: { ...EMPTY_CACHE },
  setDataCache: (patch) => set((state) => ({ dataCache: { ...state.dataCache, ...patch } })),
}));

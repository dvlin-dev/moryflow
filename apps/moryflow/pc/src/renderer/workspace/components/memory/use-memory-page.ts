import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  MemoryOverview,
  MemoryFact,
  MemoryGraphEntity,
  MemoryGraphRelation,
  MemorySearchResult,
} from '@shared/ipc';
import { extractMemoryErrorMessage } from './const';
import { useMemoryStore } from './memory-store';

export interface MemoryPageState {
  overview: MemoryOverview | null;
  overviewLoading: boolean;
  overviewError: string | null;
  personalFacts: MemoryFact[];
  personalFactsLoading: boolean;
  personalFactsHasMore: boolean;
  knowledgeFacts: MemoryFact[];
  knowledgeFactsLoading: boolean;
  graphEntities: MemoryGraphEntity[];
  graphRelations: MemoryGraphRelation[];
  graphLoading: boolean;
  knowledgeSearchResults: MemorySearchResult | null;
  knowledgeSearchLoading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  createFact: (text: string) => Promise<void>;
  updateFact: (id: string, text: string) => Promise<void>;
  deleteFact: (id: string) => Promise<void>;
  batchDeleteFacts: (ids: string[]) => Promise<void>;
  feedbackFact: (id: string, feedback: 'positive' | 'negative' | 'very_negative') => Promise<void>;
  searchKnowledge: (query: string) => Promise<void>;
  clearKnowledgeSearch: () => void;
  loadGraph: (query?: string) => Promise<void>;
  loadMorePersonalFacts: () => Promise<void>;
}

const genRequestId = (): string => Math.random().toString(36).slice(2);

export function useMemoryPage(scopeKey: string | undefined): MemoryPageState {
  const cached = useMemoryStore((s) => s.dataCache);
  const setDataCache = useMemoryStore((s) => s.setDataCache);
  const isSameScope = cached.scopeKey === scopeKey;
  const hasCache = isSameScope && cached.overview !== null;

  const [overview, setOverview] = useState<MemoryOverview | null>(
    isSameScope ? cached.overview : null
  );
  const [overviewLoading, setOverviewLoading] = useState(!hasCache);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [personalFacts, setPersonalFacts] = useState<MemoryFact[]>(
    isSameScope ? cached.personalFacts : []
  );
  const [personalFactsLoading, setPersonalFactsLoading] = useState(!hasCache);
  const [personalFactsHasMore, setPersonalFactsHasMore] = useState(
    isSameScope ? cached.personalFactsHasMore : false
  );
  const personalFactsPageRef = useRef(1);

  const [knowledgeFacts, setKnowledgeFacts] = useState<MemoryFact[]>(
    isSameScope ? cached.knowledgeFacts : []
  );
  const [knowledgeFactsLoading, setKnowledgeFactsLoading] = useState(!hasCache);

  const [graphEntities, setGraphEntities] = useState<MemoryGraphEntity[]>(
    isSameScope ? cached.graphEntities : []
  );
  const [graphRelations, setGraphRelations] = useState<MemoryGraphRelation[]>(
    isSameScope ? cached.graphRelations : []
  );
  const [graphLoading, setGraphLoading] = useState(!hasCache);

  const [refreshing, setRefreshing] = useState(false);

  const [knowledgeSearchResults, setKnowledgeSearchResults] = useState<MemorySearchResult | null>(
    null
  );
  const [knowledgeSearchLoading, setKnowledgeSearchLoading] = useState(false);

  const overviewReqRef = useRef<string>('');
  const personalReqRef = useRef<string>('');
  const knowledgeReqRef = useRef<string>('');
  const graphReqRef = useRef<string>('');
  const knowledgeSearchReqRef = useRef<string>('');
  const refreshCounterRef = useRef(0);
  const UNINITIALIZED = useRef(Symbol('uninitialized')).current;
  const prevScopeKeyRef = useRef<string | undefined | symbol>(UNINITIALIZED);

  const loadOverview = useCallback(async () => {
    const reqId = genRequestId();
    overviewReqRef.current = reqId;
    setOverviewError(null);
    try {
      const result = await window.desktopAPI.memory.getOverview();
      if (overviewReqRef.current === reqId) {
        setOverview(result);
        setDataCache({ overview: result });
      }
    } catch (err) {
      if (overviewReqRef.current === reqId) {
        setOverviewError(extractMemoryErrorMessage(err));
      }
    } finally {
      if (overviewReqRef.current === reqId) {
        setOverviewLoading(false);
      }
    }
  }, [setDataCache]);

  const loadPersonalFacts = useCallback(async () => {
    const reqId = genRequestId();
    personalReqRef.current = reqId;
    personalFactsPageRef.current = 1;
    try {
      const result = await window.desktopAPI.memory.listFacts({
        kind: 'manual',
        pageSize: 30,
        page: 1,
      });
      if (personalReqRef.current === reqId) {
        setPersonalFacts(result.items);
        setPersonalFactsHasMore(result.hasMore);
        setDataCache({
          personalFacts: result.items,
          personalFactsHasMore: result.hasMore,
        });
      }
    } catch {
      // Silently handle — overview error already shown
    } finally {
      if (personalReqRef.current === reqId) {
        setPersonalFactsLoading(false);
      }
    }
  }, [setDataCache]);

  const loadMorePersonalFacts = useCallback(async () => {
    if (!personalFactsHasMore) return;
    const nextPage = personalFactsPageRef.current + 1;
    const reqId = genRequestId();
    personalReqRef.current = reqId;
    setPersonalFactsLoading(true);
    try {
      const result = await window.desktopAPI.memory.listFacts({
        kind: 'manual',
        pageSize: 30,
        page: nextPage,
      });
      if (personalReqRef.current === reqId) {
        personalFactsPageRef.current = nextPage;
        let merged: MemoryFact[] = [];
        setPersonalFacts((prev) => {
          merged = [...prev, ...result.items];
          return merged;
        });
        setPersonalFactsHasMore(result.hasMore);
        setDataCache({ personalFacts: merged, personalFactsHasMore: result.hasMore });
      }
    } catch {
      // Silently handle
    } finally {
      if (personalReqRef.current === reqId) {
        setPersonalFactsLoading(false);
      }
    }
  }, [personalFactsHasMore, setDataCache]);

  const loadKnowledgeFacts = useCallback(async () => {
    const reqId = genRequestId();
    knowledgeReqRef.current = reqId;
    try {
      const result = await window.desktopAPI.memory.listFacts({ kind: 'derived', pageSize: 20 });
      if (knowledgeReqRef.current === reqId) {
        setKnowledgeFacts(result.items);
        setDataCache({ knowledgeFacts: result.items });
      }
    } catch {
      // Silently handle
    } finally {
      if (knowledgeReqRef.current === reqId) {
        setKnowledgeFactsLoading(false);
      }
    }
  }, [setDataCache]);

  const loadGraph = useCallback(
    async (query?: string) => {
      const reqId = genRequestId();
      graphReqRef.current = reqId;
      setGraphLoading(true);
      try {
        const result = await window.desktopAPI.memory.queryGraph(query ? { query } : {});
        if (graphReqRef.current === reqId) {
          setGraphEntities(result.entities);
          setGraphRelations(result.relations);
          if (!query) {
            setDataCache({ graphEntities: result.entities, graphRelations: result.relations });
          }
        }
      } catch {
        // Silently handle
      } finally {
        if (graphReqRef.current === reqId) {
          setGraphLoading(false);
        }
      }
    },
    [setDataCache]
  );

  const refresh = useCallback(async () => {
    const id = ++refreshCounterRef.current;
    setRefreshing(true);
    await Promise.all([loadOverview(), loadPersonalFacts(), loadKnowledgeFacts(), loadGraph()]);
    if (refreshCounterRef.current === id) {
      setRefreshing(false);
    }
  }, [loadOverview, loadPersonalFacts, loadKnowledgeFacts, loadGraph]);

  useEffect(() => {
    if (prevScopeKeyRef.current === scopeKey) return;
    prevScopeKeyRef.current = scopeKey;

    overviewReqRef.current = '';
    personalReqRef.current = '';
    personalFactsPageRef.current = 1;
    knowledgeReqRef.current = '';
    graphReqRef.current = '';
    knowledgeSearchReqRef.current = '';

    if (!isSameScope) {
      setOverview(null);
      setOverviewLoading(true);
      setOverviewError(null);
      setPersonalFacts([]);
      setPersonalFactsLoading(true);
      setPersonalFactsHasMore(false);
      setKnowledgeFacts([]);
      setKnowledgeFactsLoading(true);
      setGraphEntities([]);
      setGraphRelations([]);
      setGraphLoading(true);
      setKnowledgeSearchResults(null);
      setKnowledgeSearchLoading(false);
      setDataCache({
        scopeKey,
        overview: null,
        personalFacts: [],
        personalFactsHasMore: false,
        knowledgeFacts: [],
        graphEntities: [],
        graphRelations: [],
      });
    }

    void refresh();
  }, [scopeKey, refresh, isSameScope, setDataCache]);

  const createFact = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      await window.desktopAPI.memory.createFact({ text: trimmed });
      await Promise.all([loadOverview(), loadPersonalFacts()]);
    },
    [loadOverview, loadPersonalFacts]
  );

  const updateFact = useCallback(
    async (id: string, text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      await window.desktopAPI.memory.updateFact({ factId: id, text: trimmed });
      await Promise.all([loadOverview(), loadPersonalFacts(), loadKnowledgeFacts()]);
    },
    [loadOverview, loadPersonalFacts, loadKnowledgeFacts]
  );

  const deleteFact = useCallback(
    async (id: string) => {
      await window.desktopAPI.memory.deleteFact(id);
      await Promise.all([loadOverview(), loadPersonalFacts(), loadKnowledgeFacts()]);
    },
    [loadOverview, loadPersonalFacts, loadKnowledgeFacts]
  );

  const batchDeleteFacts = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      await window.desktopAPI.memory.batchDeleteFacts({ factIds: ids });
      await Promise.all([loadOverview(), loadPersonalFacts(), loadKnowledgeFacts()]);
    },
    [loadOverview, loadPersonalFacts, loadKnowledgeFacts]
  );

  const feedbackFact = useCallback(
    async (id: string, feedback: 'positive' | 'negative' | 'very_negative') => {
      await window.desktopAPI.memory.feedbackFact({ factId: id, feedback });
    },
    []
  );

  const searchKnowledge = useCallback(async (query: string) => {
    const reqId = genRequestId();
    knowledgeSearchReqRef.current = reqId;
    setKnowledgeSearchLoading(true);
    try {
      const result = await window.desktopAPI.memory.search({
        query,
        includeGraphContext: true,
      });
      if (knowledgeSearchReqRef.current === reqId) {
        setKnowledgeSearchResults(result);
      }
    } catch {
      // Silently handle
    } finally {
      if (knowledgeSearchReqRef.current === reqId) {
        setKnowledgeSearchLoading(false);
      }
    }
  }, []);

  const clearKnowledgeSearch = useCallback(() => {
    knowledgeSearchReqRef.current = '';
    setKnowledgeSearchResults(null);
    setKnowledgeSearchLoading(false);
  }, []);

  return {
    overview,
    overviewLoading,
    overviewError,
    personalFacts,
    personalFactsLoading,
    personalFactsHasMore,
    knowledgeFacts,
    knowledgeFactsLoading,
    graphEntities,
    graphRelations,
    graphLoading,
    knowledgeSearchResults,
    knowledgeSearchLoading,
    refreshing,
    refresh,
    createFact,
    updateFact,
    deleteFact,
    batchDeleteFacts,
    feedbackFact,
    searchKnowledge,
    clearKnowledgeSearch,
    loadGraph,
    loadMorePersonalFacts,
  };
}

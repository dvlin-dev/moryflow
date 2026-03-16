import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  MemoryOverview,
  MemoryFact,
  MemoryGraphEntity,
  MemoryGraphRelation,
  MemorySearchResult,
} from '@shared/ipc';
import { extractMemoryErrorMessage } from './const';

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
  searchResults: MemorySearchResult | null;
  searchLoading: boolean;
  knowledgeSearchResults: MemorySearchResult | null;
  knowledgeSearchLoading: boolean;
  refresh: () => Promise<void>;
  createFact: (text: string) => Promise<void>;
  updateFact: (id: string, text: string) => Promise<void>;
  deleteFact: (id: string) => Promise<void>;
  batchDeleteFacts: (ids: string[]) => Promise<void>;
  feedbackFact: (id: string, feedback: 'positive' | 'negative' | 'very_negative') => Promise<void>;
  searchAll: (query: string) => Promise<void>;
  clearSearch: () => void;
  searchKnowledge: (query: string) => Promise<void>;
  clearKnowledgeSearch: () => void;
  loadGraph: (query?: string) => Promise<void>;
  loadMorePersonalFacts: () => Promise<void>;
}

const genRequestId = (): string => Math.random().toString(36).slice(2);

export function useMemoryPage(scopeKey: string | undefined): MemoryPageState {
  const [overview, setOverview] = useState<MemoryOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [personalFacts, setPersonalFacts] = useState<MemoryFact[]>([]);
  const [personalFactsLoading, setPersonalFactsLoading] = useState(true);
  const [personalFactsHasMore, setPersonalFactsHasMore] = useState(false);
  const personalFactsPageRef = useRef(1);

  const [knowledgeFacts, setKnowledgeFacts] = useState<MemoryFact[]>([]);
  const [knowledgeFactsLoading, setKnowledgeFactsLoading] = useState(true);

  const [graphEntities, setGraphEntities] = useState<MemoryGraphEntity[]>([]);
  const [graphRelations, setGraphRelations] = useState<MemoryGraphRelation[]>([]);
  const [graphLoading, setGraphLoading] = useState(true);

  const [searchResults, setSearchResults] = useState<MemorySearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [knowledgeSearchResults, setKnowledgeSearchResults] = useState<MemorySearchResult | null>(
    null
  );
  const [knowledgeSearchLoading, setKnowledgeSearchLoading] = useState(false);

  const overviewReqRef = useRef<string>('');
  const personalReqRef = useRef<string>('');
  const knowledgeReqRef = useRef<string>('');
  const graphReqRef = useRef<string>('');
  const searchReqRef = useRef<string>('');
  const knowledgeSearchReqRef = useRef<string>('');
  const prevScopeKeyRef = useRef<string | undefined>(undefined);

  const loadOverview = useCallback(async () => {
    const reqId = genRequestId();
    overviewReqRef.current = reqId;
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const result = await window.desktopAPI.memory.getOverview();
      if (overviewReqRef.current === reqId) {
        setOverview(result);
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
  }, []);

  const loadPersonalFacts = useCallback(async () => {
    const reqId = genRequestId();
    personalReqRef.current = reqId;
    personalFactsPageRef.current = 1;
    setPersonalFactsLoading(true);
    try {
      const result = await window.desktopAPI.memory.listFacts({
        kind: 'manual',
        pageSize: 30,
        page: 1,
      });
      if (personalReqRef.current === reqId) {
        setPersonalFacts(result.items);
        setPersonalFactsHasMore(result.hasMore);
      }
    } catch {
      // Silently handle — overview error already shown
    } finally {
      if (personalReqRef.current === reqId) {
        setPersonalFactsLoading(false);
      }
    }
  }, []);

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
        setPersonalFacts((prev) => [...prev, ...result.items]);
        setPersonalFactsHasMore(result.hasMore);
      }
    } catch {
      // Silently handle
    } finally {
      if (personalReqRef.current === reqId) {
        setPersonalFactsLoading(false);
      }
    }
  }, [personalFactsHasMore]);

  const loadKnowledgeFacts = useCallback(async () => {
    const reqId = genRequestId();
    knowledgeReqRef.current = reqId;
    setKnowledgeFactsLoading(true);
    try {
      const result = await window.desktopAPI.memory.listFacts({ kind: 'derived', pageSize: 20 });
      if (knowledgeReqRef.current === reqId) {
        setKnowledgeFacts(result.items);
      }
    } catch {
      // Silently handle
    } finally {
      if (knowledgeReqRef.current === reqId) {
        setKnowledgeFactsLoading(false);
      }
    }
  }, []);

  const loadGraph = useCallback(async (query?: string) => {
    const reqId = genRequestId();
    graphReqRef.current = reqId;
    setGraphLoading(true);
    try {
      const result = await window.desktopAPI.memory.queryGraph(query ? { query } : {});
      if (graphReqRef.current === reqId) {
        setGraphEntities(result.entities);
        setGraphRelations(result.relations);
      }
    } catch {
      // Silently handle
    } finally {
      if (graphReqRef.current === reqId) {
        setGraphLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadOverview(), loadPersonalFacts(), loadKnowledgeFacts(), loadGraph()]);
  }, [loadOverview, loadPersonalFacts, loadKnowledgeFacts, loadGraph]);

  // Reset all state when scopeKey (vault path) changes to avoid stale data after workspace switch
  useEffect(() => {
    if (prevScopeKeyRef.current === scopeKey) return;
    prevScopeKeyRef.current = scopeKey;

    // Cancel all in-flight requests and reset page counters
    overviewReqRef.current = '';
    personalReqRef.current = '';
    personalFactsPageRef.current = 1;
    knowledgeReqRef.current = '';
    graphReqRef.current = '';
    searchReqRef.current = '';
    knowledgeSearchReqRef.current = '';

    // Reset all state to initial values
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
    setSearchResults(null);
    setSearchLoading(false);
    setKnowledgeSearchResults(null);
    setKnowledgeSearchLoading(false);

    void refresh();
  }, [scopeKey, refresh]);

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

  const searchAll = useCallback(async (query: string) => {
    const reqId = genRequestId();
    searchReqRef.current = reqId;
    setSearchLoading(true);
    try {
      const result = await window.desktopAPI.memory.search({
        query,
        includeGraphContext: true,
      });
      if (searchReqRef.current === reqId) {
        setSearchResults(result);
      }
    } catch {
      // Silently handle
    } finally {
      if (searchReqRef.current === reqId) {
        setSearchLoading(false);
      }
    }
  }, []);

  const clearSearch = useCallback(() => {
    searchReqRef.current = '';
    setSearchResults(null);
    setSearchLoading(false);
  }, []);

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
    searchResults,
    searchLoading,
    knowledgeSearchResults,
    knowledgeSearchLoading,
    refresh,
    createFact,
    updateFact,
    deleteFact,
    batchDeleteFacts,
    feedbackFact,
    searchAll,
    clearSearch,
    searchKnowledge,
    clearKnowledgeSearch,
    loadGraph,
    loadMorePersonalFacts,
  };
}

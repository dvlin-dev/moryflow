import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  MemoryOverview,
  MemoryFact,
  MemoryGraphEntity,
  MemoryGraphRelation,
  MemoryKnowledgeStatusItem,
} from '@shared/ipc';
import { extractMemoryErrorMessage } from './const';
import { useMemoryStore } from './memory-store';

const BOOTSTRAP_POLL_INTERVAL_MS = 2_000;

const hasActiveKnowledgeItems = (overview: MemoryOverview | null): boolean =>
  (overview?.indexing.attentionSourceCount ?? 0) > 0 ||
  (overview?.indexing.indexingSourceCount ?? 0) > 0;

export interface MemoryPageState {
  overview: MemoryOverview | null;
  overviewLoading: boolean;
  overviewError: string | null;
  personalFacts: MemoryFact[];
  personalFactsLoading: boolean;
  personalFactsHasMore: boolean;
  knowledgeAttentionItems: MemoryKnowledgeStatusItem[];
  knowledgeIndexingItems: MemoryKnowledgeStatusItem[];
  knowledgeStatusesLoading: boolean;
  graphEntities: MemoryGraphEntity[];
  graphRelations: MemoryGraphRelation[];
  graphLoading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  createFact: (text: string) => Promise<void>;
  updateFact: (id: string, text: string) => Promise<void>;
  deleteFact: (id: string) => Promise<void>;
  batchDeleteFacts: (ids: string[]) => Promise<void>;
  feedbackFact: (id: string, feedback: 'positive' | 'negative' | 'very_negative') => Promise<void>;
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
  const personalFactsRef = useRef(personalFacts);
  personalFactsRef.current = personalFacts;

  const [knowledgeAttentionItems, setKnowledgeAttentionItems] = useState<
    MemoryKnowledgeStatusItem[]
  >([]);
  const [knowledgeIndexingItems, setKnowledgeIndexingItems] = useState<MemoryKnowledgeStatusItem[]>(
    []
  );
  const [knowledgeStatusesLoading, setKnowledgeStatusesLoading] = useState(true);

  const [graphEntities, setGraphEntities] = useState<MemoryGraphEntity[]>(
    isSameScope ? cached.graphEntities : []
  );
  const [graphRelations, setGraphRelations] = useState<MemoryGraphRelation[]>(
    isSameScope ? cached.graphRelations : []
  );
  const [graphLoading, setGraphLoading] = useState(!hasCache);

  const [refreshing, setRefreshing] = useState(false);
  const [bootstrapPollTick, setBootstrapPollTick] = useState(0);

  const overviewReqRef = useRef<string>('');
  const personalReqRef = useRef<string>('');
  const knowledgeStatusesReqRef = useRef<string>('');
  const graphReqRef = useRef<string>('');
  const graphQueryRef = useRef<string | undefined>(undefined);
  const refreshCounterRef = useRef(0);
  const UNINITIALIZED = useRef(Symbol('uninitialized')).current;
  const prevScopeKeyRef = useRef<string | undefined | symbol>(UNINITIALIZED);
  const prevProjectionPendingRef = useRef(false);
  const prevProjectionScopeKeyRef = useRef<string | undefined | symbol>(UNINITIALIZED);
  const projectionTransitionPrimedRef = useRef(false);

  const loadOverview = useCallback(async (): Promise<MemoryOverview | null> => {
    const reqId = genRequestId();
    overviewReqRef.current = reqId;
    setOverviewError(null);
    let appliedResult: MemoryOverview | null = null;
    try {
      const result = await window.desktopAPI.memory.getOverview();
      if (overviewReqRef.current === reqId) {
        setOverview(result);
        setDataCache({ overview: result });
        appliedResult = result;
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
    return appliedResult;
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
        const merged = [...personalFactsRef.current, ...result.items];
        setPersonalFacts(merged);
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

  const loadKnowledgeStatuses = useCallback(async () => {
    const reqId = genRequestId();
    knowledgeStatusesReqRef.current = reqId;
    try {
      const [attentionResult, indexingResult] = await Promise.all([
        window.desktopAPI.memory.getKnowledgeStatuses({ filter: 'attention' }),
        window.desktopAPI.memory.getKnowledgeStatuses({ filter: 'indexing' }),
      ]);
      if (knowledgeStatusesReqRef.current === reqId) {
        setKnowledgeAttentionItems(attentionResult.items);
        setKnowledgeIndexingItems(indexingResult.items);
      }
    } catch {
      // Silently handle
    } finally {
      if (knowledgeStatusesReqRef.current === reqId) {
        setKnowledgeStatusesLoading(false);
      }
    }
  }, []);

  const loadGraph = useCallback(
    async (query?: string) => {
      const reqId = genRequestId();
      graphReqRef.current = reqId;
      const normalizedQuery = query?.trim() ? query.trim() : undefined;
      graphQueryRef.current = normalizedQuery;
      if (normalizedQuery) setGraphLoading(true);
      try {
        const result = await window.desktopAPI.memory.queryGraph(
          normalizedQuery ? { query: normalizedQuery } : {}
        );
        if (graphReqRef.current === reqId) {
          setGraphEntities(result.entities);
          setGraphRelations(result.relations);
          if (!normalizedQuery) {
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
    setKnowledgeStatusesLoading(true);
    await Promise.all([loadOverview(), loadPersonalFacts(), loadKnowledgeStatuses(), loadGraph()]);
    if (refreshCounterRef.current === id) {
      setRefreshing(false);
    }
  }, [loadOverview, loadPersonalFacts, loadKnowledgeStatuses, loadGraph]);

  useEffect(() => {
    if (prevScopeKeyRef.current === scopeKey) return;
    prevScopeKeyRef.current = scopeKey;

    overviewReqRef.current = '';
    personalReqRef.current = '';
    personalFactsPageRef.current = 1;
    knowledgeStatusesReqRef.current = '';
    graphReqRef.current = '';
    prevProjectionPendingRef.current = false;
    projectionTransitionPrimedRef.current = false;
    setBootstrapPollTick(0);

    if (!isSameScope) {
      setOverview(null);
      setOverviewLoading(true);
      setOverviewError(null);
      setPersonalFacts([]);
      setPersonalFactsLoading(true);
      setPersonalFactsHasMore(false);
      setKnowledgeAttentionItems([]);
      setKnowledgeIndexingItems([]);
      setKnowledgeStatusesLoading(true);
      setGraphEntities([]);
      setGraphRelations([]);
      setGraphLoading(true);
      setDataCache({
        scopeKey,
        overview: null,
        personalFacts: [],
        personalFactsHasMore: false,
        graphEntities: [],
        graphRelations: [],
      });
    }

    void refresh();
  }, [scopeKey, refresh, isSameScope, setDataCache]);

  const bootstrapPending = overview?.bootstrap.pending ?? false;
  const projectionPending = overview?.projection.pending ?? false;
  const shouldPollBootstrap = overview !== null && (bootstrapPending || projectionPending);

  useEffect(() => {
    if (!shouldPollBootstrap) {
      return;
    }

    const timer = window.setTimeout(() => {
      const poll = (async () => {
        if (bootstrapPending) {
          await Promise.all([
            loadOverview(),
            loadKnowledgeStatuses(),
            loadGraph(graphQueryRef.current),
          ]);
          return;
        }

        const refreshedOverview = await loadOverview();
        if (
          refreshedOverview?.projection.pending &&
          hasActiveKnowledgeItems(refreshedOverview)
        ) {
          await loadKnowledgeStatuses();
        }
      })();

      void poll.finally(() => {
        setBootstrapPollTick((tick) => tick + 1);
      });
    }, BOOTSTRAP_POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    shouldPollBootstrap,
    bootstrapPending,
    bootstrapPollTick,
    loadOverview,
    loadKnowledgeStatuses,
    loadGraph,
    scopeKey,
  ]);

  useEffect(() => {
    if (prevProjectionScopeKeyRef.current !== scopeKey) {
      prevProjectionScopeKeyRef.current = scopeKey;
      prevProjectionPendingRef.current = false;
      projectionTransitionPrimedRef.current = false;
      return;
    }

    if (!projectionTransitionPrimedRef.current) {
      prevProjectionPendingRef.current = projectionPending;
      projectionTransitionPrimedRef.current = true;
      return;
    }

    const wasProjectionPending = prevProjectionPendingRef.current;
    prevProjectionPendingRef.current = projectionPending;
    if (!wasProjectionPending || projectionPending) {
      return;
    }

    void Promise.all([
      loadKnowledgeStatuses(),
      loadGraph(graphQueryRef.current),
    ]);
  }, [scopeKey, projectionPending, loadKnowledgeStatuses, loadGraph]);

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
      await Promise.all([loadOverview(), loadPersonalFacts()]);
    },
    [loadOverview, loadPersonalFacts]
  );

  const deleteFact = useCallback(
    async (id: string) => {
      await window.desktopAPI.memory.deleteFact(id);
      await Promise.all([loadOverview(), loadPersonalFacts()]);
    },
    [loadOverview, loadPersonalFacts]
  );

  const batchDeleteFacts = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      await window.desktopAPI.memory.batchDeleteFacts({ factIds: ids });
      await Promise.all([loadOverview(), loadPersonalFacts()]);
    },
    [loadOverview, loadPersonalFacts]
  );

  const feedbackFact = useCallback(
    async (id: string, feedback: 'positive' | 'negative' | 'very_negative') => {
      await window.desktopAPI.memory.feedbackFact({ factId: id, feedback });
    },
    []
  );

  return {
    overview,
    overviewLoading,
    overviewError,
    personalFacts,
    personalFactsLoading,
    personalFactsHasMore,
    knowledgeAttentionItems,
    knowledgeIndexingItems,
    knowledgeStatusesLoading,
    graphEntities,
    graphRelations,
    graphLoading,
    refreshing,
    refresh,
    createFact,
    updateFact,
    deleteFact,
    batchDeleteFacts,
    feedbackFact,
    loadGraph,
    loadMorePersonalFacts,
  };
}

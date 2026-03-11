/**
 * [PROVIDES]: useMemoryPageState - Memory Workbench 状态与动作
 * [DEPENDS]: desktopAPI.memory, workspace/context, memory-workbench-store
 * [POS]: Renderer 对 Memory gateway / IPC 的统一消费层
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  MemoryEntityDetail,
  MemoryExportData,
  MemoryFact,
  MemoryFactHistory,
  MemoryGraphQueryResult,
  MemoryOverview,
  MemorySearchResult,
} from '@shared/ipc';
import { useWorkspaceNav, useWorkspaceVault } from '../../context';
import {
  MEMORY_GRAPH_QUERY_DEBOUNCE_MS,
  MEMORY_SEARCH_LIMIT_PER_GROUP,
  MEMORY_SEARCH_MIN_QUERY_LENGTH,
} from './const';
import { useMemoryWorkbenchStore, type MemoryWorkbenchTab } from './memory-workbench-store';

type AsyncState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

const createAsyncState = <T>(data: T): AsyncState<T> => ({
  data,
  loading: false,
  error: null,
});

type MemoryPageState = {
  activeTab: MemoryWorkbenchTab;
  setActiveTab: (tab: MemoryWorkbenchTab) => void;
  overview: MemoryOverview | null;
  loading: boolean;
  error: string | null;
  actionError: string | null;
  refresh: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchState: AsyncState<MemorySearchResult | null>;
  factsState: AsyncState<MemoryFact[]>;
  factDraft: string;
  setFactDraft: (value: string) => void;
  createFact: () => Promise<void>;
  selectedFact: MemoryFact | null;
  selectedFactDraft: string;
  setSelectedFactDraft: (value: string) => void;
  factHistory: MemoryFactHistory | null;
  factDetailLoading: boolean;
  openFact: (factId: string) => Promise<void>;
  markFactUseful: () => Promise<void>;
  saveSelectedFact: () => Promise<void>;
  deleteSelectedFact: () => Promise<void>;
  selectedFactIds: string[];
  toggleFactSelection: (factId: string) => void;
  deleteSelectedFacts: () => Promise<void>;
  graphQuery: string;
  setGraphQuery: (value: string) => void;
  graphState: AsyncState<MemoryGraphQueryResult | null>;
  selectedEntityDetail: MemoryEntityDetail | null;
  entityDetailLoading: boolean;
  openEntity: (entityId: string) => Promise<void>;
  exportState: AsyncState<MemoryExportData | null>;
  createExport: () => Promise<void>;
};

const getErrorMessage = (cause: unknown, fallback: string) =>
  cause instanceof Error && cause.message.trim().length > 0 ? cause.message : fallback;

export const useMemoryPageState = (): MemoryPageState => {
  const { destination } = useWorkspaceNav();
  const { vault } = useWorkspaceVault();
  const workspaceScopeKey = vault?.path ?? '__memory-no-vault__';
  const activeTab = useMemoryWorkbenchStore((state) => state.activeTab);
  const setActiveTab = useMemoryWorkbenchStore((state) => state.setActiveTab);
  const pendingFactId = useMemoryWorkbenchStore((state) => state.pendingFactId);
  const clearPendingFact = useMemoryWorkbenchStore((state) => state.clearPendingFact);
  const pendingSearchQuery = useMemoryWorkbenchStore((state) => state.pendingSearchQuery);
  const clearPendingSearchQuery = useMemoryWorkbenchStore((state) => state.clearPendingSearchQuery);

  const [overview, setOverview] = useState<MemoryOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchState, setSearchState] = useState<AsyncState<MemorySearchResult | null>>(
    createAsyncState(null)
  );
  const [factsState, setFactsState] = useState<AsyncState<MemoryFact[]>>(createAsyncState([]));
  const [factDraft, setFactDraft] = useState('');
  const [selectedFact, setSelectedFact] = useState<MemoryFact | null>(null);
  const [selectedFactDraft, setSelectedFactDraft] = useState('');
  const [factHistory, setFactHistory] = useState<MemoryFactHistory | null>(null);
  const [factDetailLoading, setFactDetailLoading] = useState(false);
  const [selectedFactIds, setSelectedFactIds] = useState<string[]>([]);
  const [graphQuery, setGraphQuery] = useState('');
  const [graphState, setGraphState] = useState<AsyncState<MemoryGraphQueryResult | null>>(
    createAsyncState(null)
  );
  const [selectedEntityDetail, setSelectedEntityDetail] = useState<MemoryEntityDetail | null>(null);
  const [entityDetailLoading, setEntityDetailLoading] = useState(false);
  const [exportState, setExportState] = useState<AsyncState<MemoryExportData | null>>(
    createAsyncState(null)
  );
  const graphRequestIdRef = useRef(0);
  const factDetailRequestIdRef = useRef(0);
  const entityDetailRequestIdRef = useRef(0);
  const currentWorkspaceScopeKeyRef = useRef(workspaceScopeKey);
  const previousWorkspaceScopeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    currentWorkspaceScopeKeyRef.current = workspaceScopeKey;
  }, [workspaceScopeKey]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextOverview = await window.desktopAPI.memory.getOverview();
      setOverview(nextOverview);
    } catch (cause) {
      setOverview(null);
      setError(getErrorMessage(cause, 'Failed to load memory overview'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFacts = useCallback(async () => {
    setFactsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await window.desktopAPI.memory.listFacts({
        kind: 'all',
        page: 1,
        pageSize: 20,
      });
      setFactsState({
        data: response.items,
        loading: false,
        error: null,
      });
    } catch (cause) {
      setFactsState((prev) => ({
        data: prev.data,
        loading: false,
        error: getErrorMessage(cause, 'Failed to load facts'),
      }));
    }
  }, []);

  const reportActionError = useCallback((cause: unknown, fallback: string) => {
    setActionError(getErrorMessage(cause, fallback));
  }, []);

  const openFact = useCallback(
    async (factId: string) => {
      const requestId = factDetailRequestIdRef.current + 1;
      factDetailRequestIdRef.current = requestId;
      const requestScopeKey = workspaceScopeKey;
      setFactDetailLoading(true);
      setActionError(null);
      try {
        const [detail, history] = await Promise.all([
          window.desktopAPI.memory.getFactDetail(factId),
          window.desktopAPI.memory.getFactHistory(factId),
        ]);
        if (
          factDetailRequestIdRef.current !== requestId ||
          currentWorkspaceScopeKeyRef.current !== requestScopeKey
        ) {
          return;
        }
        setSelectedFact(detail);
        setSelectedFactDraft(detail.text);
        setFactHistory(history);
        setActiveTab('facts');
      } catch (cause) {
        if (
          factDetailRequestIdRef.current === requestId &&
          currentWorkspaceScopeKeyRef.current === requestScopeKey
        ) {
          reportActionError(cause, 'Failed to open fact detail');
        }
      } finally {
        if (
          factDetailRequestIdRef.current === requestId &&
          currentWorkspaceScopeKeyRef.current === requestScopeKey
        ) {
          setFactDetailLoading(false);
        }
      }
    },
    [reportActionError, setActiveTab, workspaceScopeKey]
  );

  const openEntity = useCallback(
    async (entityId: string) => {
      const requestId = entityDetailRequestIdRef.current + 1;
      entityDetailRequestIdRef.current = requestId;
      const requestScopeKey = workspaceScopeKey;
      setEntityDetailLoading(true);
      setActionError(null);
      try {
        const detail = await window.desktopAPI.memory.getEntityDetail({ entityId });
        if (
          entityDetailRequestIdRef.current !== requestId ||
          currentWorkspaceScopeKeyRef.current !== requestScopeKey
        ) {
          return;
        }
        setSelectedEntityDetail(detail);
        setActiveTab('graph');
      } catch (cause) {
        if (
          entityDetailRequestIdRef.current === requestId &&
          currentWorkspaceScopeKeyRef.current === requestScopeKey
        ) {
          reportActionError(cause, 'Failed to open graph entity detail');
        }
      } finally {
        if (
          entityDetailRequestIdRef.current === requestId &&
          currentWorkspaceScopeKeyRef.current === requestScopeKey
        ) {
          setEntityDetailLoading(false);
        }
      }
    },
    [reportActionError, setActiveTab, workspaceScopeKey]
  );

  const createFact = useCallback(async () => {
    const text = factDraft.trim();
    if (text.length === 0) {
      return;
    }
    setActionError(null);
    try {
      const created = await window.desktopAPI.memory.createFact({ text });
      await loadFacts();
      setSelectedFact(created);
      setSelectedFactDraft(created.text);
      setFactHistory(await window.desktopAPI.memory.getFactHistory(created.id));
      setFactDraft('');
      refresh().catch(() => undefined);
    } catch (cause) {
      reportActionError(cause, 'Failed to create fact');
    }
  }, [factDraft, loadFacts, refresh, reportActionError]);

  const markFactUseful = useCallback(async () => {
    if (!selectedFact) {
      return;
    }
    setActionError(null);
    try {
      await window.desktopAPI.memory.feedbackFact({
        factId: selectedFact.id,
        feedback: 'positive',
      });
    } catch (cause) {
      reportActionError(cause, 'Failed to send fact feedback');
    }
  }, [reportActionError, selectedFact]);

  const saveSelectedFact = useCallback(async () => {
    if (!selectedFact || selectedFact.readOnly) {
      return;
    }
    const text = selectedFactDraft.trim();
    if (text.length === 0 || text === selectedFact.text) {
      return;
    }
    setActionError(null);
    try {
      const updated = await window.desktopAPI.memory.updateFact({
        factId: selectedFact.id,
        text,
      });
      setSelectedFact(updated);
      setSelectedFactDraft(updated.text);
      setFactHistory(await window.desktopAPI.memory.getFactHistory(updated.id));
      await loadFacts();
    } catch (cause) {
      reportActionError(cause, 'Failed to save fact changes');
    }
  }, [loadFacts, reportActionError, selectedFact, selectedFactDraft]);

  const deleteSelectedFact = useCallback(async () => {
    if (!selectedFact || selectedFact.readOnly) {
      return;
    }
    setActionError(null);
    try {
      await window.desktopAPI.memory.deleteFact(selectedFact.id);
      setSelectedFact(null);
      setSelectedFactDraft('');
      setFactHistory(null);
      setSelectedFactIds((prev) => prev.filter((id) => id !== selectedFact.id));
      await loadFacts();
      refresh().catch(() => undefined);
    } catch (cause) {
      reportActionError(cause, 'Failed to delete fact');
    }
  }, [loadFacts, refresh, reportActionError, selectedFact]);

  const toggleFactSelection = useCallback((factId: string) => {
    setSelectedFactIds((prev) =>
      prev.includes(factId) ? prev.filter((id) => id !== factId) : [...prev, factId]
    );
  }, []);

  const deleteSelectedFacts = useCallback(async () => {
    if (selectedFactIds.length === 0) {
      return;
    }
    setActionError(null);
    try {
      await window.desktopAPI.memory.batchDeleteFacts({
        factIds: selectedFactIds,
      });
      if (selectedFact && selectedFactIds.includes(selectedFact.id)) {
        setSelectedFact(null);
        setSelectedFactDraft('');
        setFactHistory(null);
      }
      setSelectedFactIds([]);
      await loadFacts();
      refresh().catch(() => undefined);
    } catch (cause) {
      reportActionError(cause, 'Failed to delete selected facts');
    }
  }, [loadFacts, refresh, reportActionError, selectedFact, selectedFactIds]);

  const createExport = useCallback(async () => {
    setExportState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const created = await window.desktopAPI.memory.createExport();
      const data = await window.desktopAPI.memory.getExport(created.exportId);
      setExportState({
        data,
        loading: false,
        error: null,
      });
    } catch (cause) {
      setExportState((prev) => ({
        data: prev.data,
        loading: false,
        error: getErrorMessage(cause, 'Failed to create export'),
      }));
    }
  }, []);

  useEffect(() => {
    if (destination !== 'memory') {
      return;
    }
    void refresh();
  }, [destination, workspaceScopeKey, refresh]);

  useEffect(() => {
    if (destination !== 'memory') {
      return;
    }
    const hasScopeChanged =
      previousWorkspaceScopeKeyRef.current !== null &&
      previousWorkspaceScopeKeyRef.current !== workspaceScopeKey;
    previousWorkspaceScopeKeyRef.current = workspaceScopeKey;
    setSearchState(createAsyncState(null));
    setFactsState(createAsyncState([]));
    setSelectedFact(null);
    setSelectedFactDraft('');
    setFactHistory(null);
    setFactDetailLoading(false);
    setSelectedFactIds([]);
    setGraphState(createAsyncState(null));
    setSelectedEntityDetail(null);
    setEntityDetailLoading(false);
    setExportState(createAsyncState(null));
    setActionError(null);
    factDetailRequestIdRef.current += 1;
    entityDetailRequestIdRef.current += 1;
    if (hasScopeChanged) {
      clearPendingFact();
      clearPendingSearchQuery();
    }
  }, [clearPendingFact, clearPendingSearchQuery, destination, workspaceScopeKey]);

  useEffect(() => {
    if (destination !== 'memory' || activeTab !== 'facts') {
      return;
    }
    void loadFacts();
  }, [activeTab, destination, loadFacts, workspaceScopeKey]);

  useEffect(() => {
    if (destination !== 'memory' || activeTab !== 'graph') {
      return;
    }
    const trimmed = graphQuery.trim();
    const requestId = graphRequestIdRef.current + 1;
    graphRequestIdRef.current = requestId;
    let alive = true;
    setGraphState((prev) => ({ ...prev, loading: true, error: null }));
    const timer = window.setTimeout(() => {
      void window.desktopAPI.memory
        .queryGraph(trimmed.length > 0 ? { query: trimmed } : {})
        .then((response) => {
          if (!alive || graphRequestIdRef.current !== requestId) {
            return;
          }
          setGraphState({
            data: response,
            loading: false,
            error: null,
          });
        })
        .catch((cause) => {
          if (!alive || graphRequestIdRef.current !== requestId) {
            return;
          }
          setGraphState((prev) => ({
            data: prev.data,
            loading: false,
            error: getErrorMessage(cause, 'Failed to load graph'),
          }));
        });
    }, MEMORY_GRAPH_QUERY_DEBOUNCE_MS);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [activeTab, destination, graphQuery, workspaceScopeKey]);

  useEffect(() => {
    if (destination !== 'memory' || activeTab !== 'search') {
      return;
    }
    if (pendingSearchQuery) {
      setSearchQuery(pendingSearchQuery);
      clearPendingSearchQuery();
    }
  }, [activeTab, clearPendingSearchQuery, destination, pendingSearchQuery]);

  useEffect(() => {
    if (destination !== 'memory' || activeTab !== 'facts' || !pendingFactId) {
      return;
    }
    void openFact(pendingFactId).finally(() => {
      clearPendingFact();
    });
  }, [activeTab, clearPendingFact, destination, openFact, pendingFactId]);

  useEffect(() => {
    if (destination !== 'memory' || activeTab !== 'search') {
      return;
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < MEMORY_SEARCH_MIN_QUERY_LENGTH) {
      setSearchState(createAsyncState(null));
      return;
    }

    let alive = true;
    setSearchState((prev) => ({ ...prev, loading: true, error: null }));
    const timer = window.setTimeout(() => {
      void window.desktopAPI.memory
        .search({
          query: trimmed,
          limitPerGroup: MEMORY_SEARCH_LIMIT_PER_GROUP,
          includeGraphContext: true,
        })
        .then((result) => {
          if (!alive) {
            return;
          }
          setSearchState({
            data: result,
            loading: false,
            error: null,
          });
        })
        .catch((cause) => {
          if (!alive) {
            return;
          }
          setSearchState((prev) => ({
            data: prev.data,
            loading: false,
            error: getErrorMessage(cause, 'Failed to search memory'),
          }));
        });
    }, 180);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [activeTab, destination, searchQuery, workspaceScopeKey]);

  const state = useMemo<MemoryPageState>(
    () => ({
      activeTab,
      setActiveTab,
      overview,
      loading,
      error,
      actionError,
      refresh,
      searchQuery,
      setSearchQuery,
      searchState,
      factsState,
      factDraft,
      setFactDraft,
      createFact,
      selectedFact,
      selectedFactDraft,
      setSelectedFactDraft,
      factHistory,
      factDetailLoading,
      openFact,
      markFactUseful,
      saveSelectedFact,
      deleteSelectedFact,
      selectedFactIds,
      toggleFactSelection,
      deleteSelectedFacts,
      graphQuery,
      setGraphQuery,
      graphState,
      selectedEntityDetail,
      entityDetailLoading,
      openEntity,
      exportState,
      createExport,
    }),
    [
      activeTab,
      setActiveTab,
      overview,
      loading,
      error,
      actionError,
      refresh,
      searchQuery,
      searchState,
      factsState,
      factDraft,
      createFact,
      selectedFact,
      selectedFactDraft,
      factHistory,
      factDetailLoading,
      openFact,
      markFactUseful,
      saveSelectedFact,
      deleteSelectedFact,
      selectedFactIds,
      toggleFactSelection,
      deleteSelectedFacts,
      graphQuery,
      graphState,
      selectedEntityDetail,
      entityDetailLoading,
      openEntity,
      exportState,
      createExport,
    ]
  );

  return state;
};

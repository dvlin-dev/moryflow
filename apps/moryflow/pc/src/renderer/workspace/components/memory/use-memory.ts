/**
 * [PROVIDES]: useMemoryPageState - Memory Workbench 状态与动作
 * [DEPENDS]: desktopAPI.memory, workspace/context, memory-workbench-store
 * [POS]: Renderer 对 Memory gateway / IPC 的统一消费层
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
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
  MEMORY_SEARCH_DEBOUNCE_MS,
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
  const pendingFactIntent = useMemoryWorkbenchStore((state) => state.pendingFactIntent);
  const clearPendingFact = useMemoryWorkbenchStore((state) => state.clearPendingFact);
  const pendingSearchIntent = useMemoryWorkbenchStore((state) => state.pendingSearchIntent);
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
  const overviewRequestIdRef = useRef(0);
  const factsRequestIdRef = useRef(0);
  const factDetailRequestIdRef = useRef(0);
  const factMutationRequestIdRef = useRef(0);
  const exportRequestIdRef = useRef(0);
  const entityDetailRequestIdRef = useRef(0);
  const currentWorkspaceScopeKeyRef = useRef(workspaceScopeKey);
  const previousWorkspaceScopeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    currentWorkspaceScopeKeyRef.current = workspaceScopeKey;
  }, [workspaceScopeKey]);

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
    if (hasScopeChanged) {
      factDetailRequestIdRef.current += 1;
      factMutationRequestIdRef.current += 1;
      exportRequestIdRef.current += 1;
      entityDetailRequestIdRef.current += 1;
      overviewRequestIdRef.current += 1;
      factsRequestIdRef.current += 1;
      if (pendingFactIntent?.scopeKey !== workspaceScopeKey) {
        clearPendingFact();
      }
      if (pendingSearchIntent?.scopeKey !== workspaceScopeKey) {
        clearPendingSearchQuery();
      }
    }
  }, [clearPendingFact, clearPendingSearchQuery, destination, workspaceScopeKey]);

  const isCurrentRequest = useCallback(
    (requestIdRef: MutableRefObject<number>, requestId: number, requestScopeKey: string) =>
      requestIdRef.current === requestId && currentWorkspaceScopeKeyRef.current === requestScopeKey,
    []
  );

  const refresh = useCallback(async () => {
    const requestId = overviewRequestIdRef.current + 1;
    overviewRequestIdRef.current = requestId;
    const requestScopeKey = workspaceScopeKey;
    setLoading(true);
    setError(null);
    try {
      const nextOverview = await window.desktopAPI.memory.getOverview();
      if (!isCurrentRequest(overviewRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      setOverview(nextOverview);
    } catch (cause) {
      if (!isCurrentRequest(overviewRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      setOverview(null);
      setError(getErrorMessage(cause, 'Failed to load memory overview'));
    } finally {
      if (isCurrentRequest(overviewRequestIdRef, requestId, requestScopeKey)) {
        setLoading(false);
      }
    }
  }, [isCurrentRequest, workspaceScopeKey]);

  const loadFacts = useCallback(async () => {
    const requestId = factsRequestIdRef.current + 1;
    factsRequestIdRef.current = requestId;
    const requestScopeKey = workspaceScopeKey;
    setFactsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await window.desktopAPI.memory.listFacts({
        kind: 'all',
        page: 1,
        pageSize: 20,
      });
      if (!isCurrentRequest(factsRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      setFactsState({
        data: response.items,
        loading: false,
        error: null,
      });
    } catch (cause) {
      if (!isCurrentRequest(factsRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      setFactsState((prev) => ({
        data: prev.data,
        loading: false,
        error: getErrorMessage(cause, 'Failed to load facts'),
      }));
    }
  }, [isCurrentRequest, workspaceScopeKey]);

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
    const requestId = factMutationRequestIdRef.current + 1;
    factMutationRequestIdRef.current = requestId;
    const requestScopeKey = workspaceScopeKey;
    setActionError(null);
    try {
      const created = await window.desktopAPI.memory.createFact({ text });
      if (!isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      await loadFacts();
      if (!isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      const history = await window.desktopAPI.memory.getFactHistory(created.id);
      if (!isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      setSelectedFact(created);
      setSelectedFactDraft(created.text);
      setFactHistory(history);
      setFactDraft('');
      refresh().catch(() => undefined);
    } catch (cause) {
      if (isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        reportActionError(cause, 'Failed to create fact');
      }
    }
  }, [factDraft, isCurrentRequest, loadFacts, refresh, reportActionError, workspaceScopeKey]);

  const markFactUseful = useCallback(async () => {
    if (!selectedFact) {
      return;
    }
    const requestId = factMutationRequestIdRef.current + 1;
    factMutationRequestIdRef.current = requestId;
    const requestScopeKey = workspaceScopeKey;
    setActionError(null);
    try {
      await window.desktopAPI.memory.feedbackFact({
        factId: selectedFact.id,
        feedback: 'positive',
      });
      if (!isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
    } catch (cause) {
      if (isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        reportActionError(cause, 'Failed to send fact feedback');
      }
    }
  }, [isCurrentRequest, reportActionError, selectedFact, workspaceScopeKey]);

  const saveSelectedFact = useCallback(async () => {
    if (!selectedFact || selectedFact.readOnly) {
      return;
    }
    const text = selectedFactDraft.trim();
    if (text.length === 0 || text === selectedFact.text) {
      return;
    }
    const requestId = factMutationRequestIdRef.current + 1;
    factMutationRequestIdRef.current = requestId;
    const requestScopeKey = workspaceScopeKey;
    setActionError(null);
    try {
      const updated = await window.desktopAPI.memory.updateFact({
        factId: selectedFact.id,
        text,
      });
      if (!isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      const history = await window.desktopAPI.memory.getFactHistory(updated.id);
      if (!isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      await loadFacts();
      if (!isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      setSelectedFact(updated);
      setSelectedFactDraft(updated.text);
      setFactHistory(history);
    } catch (cause) {
      if (isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        reportActionError(cause, 'Failed to save fact changes');
      }
    }
  }, [
    isCurrentRequest,
    loadFacts,
    reportActionError,
    selectedFact,
    selectedFactDraft,
    workspaceScopeKey,
  ]);

  const deleteSelectedFact = useCallback(async () => {
    if (!selectedFact || selectedFact.readOnly) {
      return;
    }
    const requestId = factMutationRequestIdRef.current + 1;
    factMutationRequestIdRef.current = requestId;
    const requestScopeKey = workspaceScopeKey;
    setActionError(null);
    try {
      await window.desktopAPI.memory.deleteFact(selectedFact.id);
      if (!isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      setSelectedFact(null);
      setSelectedFactDraft('');
      setFactHistory(null);
      setSelectedFactIds((prev) => prev.filter((id) => id !== selectedFact.id));
      await loadFacts();
      if (!isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      refresh().catch(() => undefined);
    } catch (cause) {
      if (isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        reportActionError(cause, 'Failed to delete fact');
      }
    }
  }, [isCurrentRequest, loadFacts, refresh, reportActionError, selectedFact, workspaceScopeKey]);

  const toggleFactSelection = useCallback((factId: string) => {
    setSelectedFactIds((prev) =>
      prev.includes(factId) ? prev.filter((id) => id !== factId) : [...prev, factId]
    );
  }, []);

  const deleteSelectedFacts = useCallback(async () => {
    if (selectedFactIds.length === 0) {
      return;
    }
    const requestId = factMutationRequestIdRef.current + 1;
    factMutationRequestIdRef.current = requestId;
    const requestScopeKey = workspaceScopeKey;
    setActionError(null);
    try {
      await window.desktopAPI.memory.batchDeleteFacts({
        factIds: selectedFactIds,
      });
      if (!isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      if (selectedFact && selectedFactIds.includes(selectedFact.id)) {
        setSelectedFact(null);
        setSelectedFactDraft('');
        setFactHistory(null);
      }
      setSelectedFactIds([]);
      await loadFacts();
      if (!isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      refresh().catch(() => undefined);
    } catch (cause) {
      if (isCurrentRequest(factMutationRequestIdRef, requestId, requestScopeKey)) {
        reportActionError(cause, 'Failed to delete selected facts');
      }
    }
  }, [
    isCurrentRequest,
    loadFacts,
    refresh,
    reportActionError,
    selectedFact,
    selectedFactIds,
    workspaceScopeKey,
  ]);

  const createExport = useCallback(async () => {
    const requestId = exportRequestIdRef.current + 1;
    exportRequestIdRef.current = requestId;
    const requestScopeKey = workspaceScopeKey;
    setExportState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const created = await window.desktopAPI.memory.createExport();
      if (!isCurrentRequest(exportRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      const data = await window.desktopAPI.memory.getExport(created.exportId);
      if (!isCurrentRequest(exportRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      setExportState({
        data,
        loading: false,
        error: null,
      });
    } catch (cause) {
      if (!isCurrentRequest(exportRequestIdRef, requestId, requestScopeKey)) {
        return;
      }
      setExportState((prev) => ({
        data: prev.data,
        loading: false,
        error: getErrorMessage(cause, 'Failed to create export'),
      }));
    }
  }, [isCurrentRequest, workspaceScopeKey]);

  useEffect(() => {
    if (destination !== 'memory') {
      return;
    }
    void refresh();
  }, [destination, workspaceScopeKey, refresh]);

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
    if (pendingSearchIntent?.scopeKey === workspaceScopeKey) {
      setSearchQuery(pendingSearchIntent.value);
      clearPendingSearchQuery();
    }
  }, [activeTab, clearPendingSearchQuery, destination, pendingSearchIntent, workspaceScopeKey]);

  useEffect(() => {
    if (
      destination !== 'memory' ||
      activeTab !== 'facts' ||
      !pendingFactIntent ||
      pendingFactIntent.scopeKey !== workspaceScopeKey
    ) {
      return;
    }
    void openFact(pendingFactIntent.value).finally(() => {
      clearPendingFact();
    });
  }, [activeTab, clearPendingFact, destination, openFact, pendingFactIntent, workspaceScopeKey]);

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
    }, MEMORY_SEARCH_DEBOUNCE_MS);

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

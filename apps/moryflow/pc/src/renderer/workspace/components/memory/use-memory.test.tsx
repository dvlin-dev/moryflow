import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMemoryPageState } from './use-memory';
import { resetMemoryWorkbenchStore, useMemoryWorkbenchStore } from './memory-workbench-store';

const mockUseWorkspaceNav = vi.fn();
const mockUseWorkspaceVault = vi.fn();

vi.mock('../../context', () => ({
  useWorkspaceNav: () => mockUseWorkspaceNav(),
  useWorkspaceVault: () => mockUseWorkspaceVault(),
}));

describe('useMemoryPageState', () => {
  beforeEach(() => {
    vi.useRealTimers();
    resetMemoryWorkbenchStore();
    mockUseWorkspaceNav.mockReturnValue({
      destination: 'memory',
    });
    mockUseWorkspaceVault.mockReturnValue({
      vault: {
        path: '/vaults/alpha',
      },
    });
    window.desktopAPI = {
      ...window.desktopAPI,
      memory: {
        ...window.desktopAPI?.memory,
        getOverview: vi.fn(async () => ({
          scope: {
            workspaceId: 'workspace-1',
            workspaceName: 'Workspace',
            localPath: '/vaults/alpha',
            vaultId: 'vault-1',
            projectId: 'vault-1',
          },
          binding: {
            loggedIn: true,
            bound: true,
          },
          sync: {
            engineStatus: 'idle',
            lastSyncAt: null,
            storageUsedBytes: 1,
          },
          indexing: {
            sourceCount: 1,
            indexedSourceCount: 1,
            pendingSourceCount: 0,
            failedSourceCount: 0,
            lastIndexedAt: null,
          },
          facts: {
            manualCount: 1,
            derivedCount: 0,
          },
          graph: {
            entityCount: 0,
            relationCount: 0,
            projectionStatus: 'idle',
            lastProjectedAt: null,
          },
        })),
      },
    } as typeof window.desktopAPI;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refreshes overview again when the active workspace changes while staying in Memory', async () => {
    const getOverview = vi
      .fn()
      .mockResolvedValueOnce({
        scope: {
          workspaceId: 'workspace-1',
          workspaceName: 'Workspace A',
          localPath: '/vaults/alpha',
          vaultId: 'vault-1',
          projectId: 'vault-1',
        },
        binding: {
          loggedIn: true,
          bound: true,
        },
        sync: {
          engineStatus: 'idle',
          lastSyncAt: null,
          storageUsedBytes: 1,
        },
        indexing: {
          sourceCount: 1,
          indexedSourceCount: 1,
          pendingSourceCount: 0,
          failedSourceCount: 0,
          lastIndexedAt: null,
        },
        facts: {
          manualCount: 1,
          derivedCount: 0,
        },
        graph: {
          entityCount: 0,
          relationCount: 0,
          projectionStatus: 'idle',
          lastProjectedAt: null,
        },
      })
      .mockResolvedValueOnce({
        scope: {
          workspaceId: 'workspace-2',
          workspaceName: 'Workspace B',
          localPath: '/vaults/beta',
          vaultId: 'vault-2',
          projectId: 'vault-2',
        },
        binding: {
          loggedIn: true,
          bound: true,
        },
        sync: {
          engineStatus: 'idle',
          lastSyncAt: null,
          storageUsedBytes: 2,
        },
        indexing: {
          sourceCount: 2,
          indexedSourceCount: 2,
          pendingSourceCount: 0,
          failedSourceCount: 0,
          lastIndexedAt: null,
        },
        facts: {
          manualCount: 2,
          derivedCount: 0,
        },
        graph: {
          entityCount: 1,
          relationCount: 0,
          projectionStatus: 'building',
          lastProjectedAt: null,
        },
      });

    window.desktopAPI = {
      ...window.desktopAPI,
      memory: {
        ...window.desktopAPI?.memory,
        getOverview,
      },
    } as typeof window.desktopAPI;

    const { result, rerender } = renderHook(() => useMemoryPageState());

    await waitFor(() => {
      expect(result.current.overview?.scope.workspaceId).toBe('workspace-1');
    });

    mockUseWorkspaceVault.mockReturnValue({
      vault: {
        path: '/vaults/beta',
      },
    });
    rerender();

    await waitFor(() => {
      expect(result.current.overview?.scope.workspaceId).toBe('workspace-2');
    });
    expect(getOverview).toHaveBeenCalledTimes(2);
  });

  it('clears stale tab state and reloads facts for the new workspace', async () => {
    const getOverview = vi.fn().mockResolvedValue({
      scope: {
        workspaceId: 'workspace-1',
        workspaceName: 'Workspace A',
        localPath: '/vaults/alpha',
        vaultId: 'vault-1',
        projectId: 'vault-1',
      },
      binding: {
        loggedIn: true,
        bound: true,
      },
      sync: {
        engineStatus: 'idle',
        lastSyncAt: null,
        storageUsedBytes: 1,
      },
      indexing: {
        sourceCount: 1,
        indexedSourceCount: 1,
        pendingSourceCount: 0,
        failedSourceCount: 0,
        lastIndexedAt: null,
      },
      facts: {
        manualCount: 1,
        derivedCount: 0,
      },
      graph: {
        entityCount: 0,
        relationCount: 0,
        projectionStatus: 'idle',
        lastProjectedAt: null,
      },
    });
    const listFacts = vi
      .fn()
      .mockResolvedValueOnce({
        items: [
          {
            id: 'fact-a',
            text: 'Alpha fact',
            kind: 'manual',
            readOnly: false,
            metadata: null,
            sourceId: null,
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
        hasMore: false,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'fact-b',
            text: 'Beta fact',
            kind: 'manual',
            readOnly: false,
            metadata: null,
            sourceId: null,
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
        hasMore: false,
      });
    const getFactDetail = vi.fn().mockResolvedValue({
      id: 'fact-a',
      text: 'Alpha fact',
      kind: 'manual',
      readOnly: false,
      metadata: null,
      sourceId: null,
    });
    const getFactHistory = vi.fn().mockResolvedValue({ factId: 'fact-a', entries: [] });

    window.desktopAPI = {
      ...window.desktopAPI,
      memory: {
        ...window.desktopAPI?.memory,
        getOverview,
        listFacts,
        getFactDetail,
        getFactHistory,
      },
    } as typeof window.desktopAPI;

    useMemoryWorkbenchStore.setState({ activeTab: 'facts' });
    const { result, rerender } = renderHook(() => useMemoryPageState());

    await waitFor(() => {
      expect(result.current.factsState.data[0]?.id).toBe('fact-a');
    });

    await act(async () => {
      await result.current.openFact('fact-a');
    });
    expect(result.current.selectedFact?.id).toBe('fact-a');

    mockUseWorkspaceVault.mockReturnValue({
      vault: {
        path: '/vaults/beta',
      },
    });
    rerender();

    await waitFor(() => {
      expect(result.current.factsState.data[0]?.id).toBe('fact-b');
    });
    expect(result.current.selectedFact).toBeNull();
    expect(result.current.factHistory).toBeNull();
  });

  it('does not fetch while the destination is not memory', async () => {
    const getOverview = vi.fn();
    window.desktopAPI = {
      ...window.desktopAPI,
      memory: {
        ...window.desktopAPI?.memory,
        getOverview,
      },
    } as typeof window.desktopAPI;
    mockUseWorkspaceNav.mockReturnValue({
      destination: 'skills',
    });

    renderHook(() => useMemoryPageState());

    await act(async () => {});
    expect(getOverview).not.toHaveBeenCalled();
  });

  it('keeps the draft and reports an action error when createFact fails', async () => {
    window.desktopAPI = {
      ...window.desktopAPI,
      memory: {
        ...window.desktopAPI?.memory,
        createFact: vi.fn(async () => {
          throw new Error('Create failed');
        }),
      },
    } as typeof window.desktopAPI;

    const { result } = renderHook(() => useMemoryPageState());

    await act(async () => {
      result.current.setFactDraft('Draft fact');
    });

    await act(async () => {
      await result.current.createFact();
    });

    expect(result.current.factDraft).toBe('Draft fact');
    expect(result.current.actionError).toBe('Create failed');
  });

  it('clears pending intent state when the workspace changes', async () => {
    let resolveDetail: ((value: unknown) => void) | null = null;
    const detailPromise = new Promise((resolve) => {
      resolveDetail = resolve;
    });

    window.desktopAPI = {
      ...window.desktopAPI,
      memory: {
        ...window.desktopAPI?.memory,
        getFactDetail: vi.fn(() => detailPromise as Promise<any>),
        getFactHistory: vi.fn(() => detailPromise as Promise<any>),
      },
    } as typeof window.desktopAPI;

    useMemoryWorkbenchStore.setState({
      activeTab: 'facts',
      pendingFactId: 'fact-a',
      pendingSearchQuery: 'alpha',
    });

    const { rerender } = renderHook(() => useMemoryPageState());

    await act(async () => {
      await Promise.resolve();
    });

    mockUseWorkspaceVault.mockReturnValue({
      vault: {
        path: '/vaults/beta',
      },
    });
    rerender();

    await waitFor(() => {
      expect(useMemoryWorkbenchStore.getState().pendingFactId).toBeNull();
      expect(useMemoryWorkbenchStore.getState().pendingSearchQuery).toBeNull();
    });

    await act(async () => {
      resolveDetail?.({
        id: 'fact-a',
        text: 'Alpha fact',
        kind: 'manual',
        readOnly: false,
        metadata: null,
        sourceId: null,
      });
      await Promise.resolve();
    });

    expect(useMemoryWorkbenchStore.getState().pendingFactId).toBeNull();
  });

  it('discards stale fact detail responses after a workspace switch', async () => {
    let resolveDetail: ((value: unknown) => void) | null = null;
    let resolveHistory: ((value: unknown) => void) | null = null;
    const detailPromise = new Promise((resolve) => {
      resolveDetail = resolve;
    });
    const historyPromise = new Promise((resolve) => {
      resolveHistory = resolve;
    });

    window.desktopAPI = {
      ...window.desktopAPI,
      memory: {
        ...window.desktopAPI?.memory,
        getFactDetail: vi.fn(() => detailPromise as Promise<any>),
        getFactHistory: vi.fn(() => historyPromise as Promise<any>),
      },
    } as typeof window.desktopAPI;

    const { result, rerender } = renderHook(() => useMemoryPageState());

    await act(async () => {
      void result.current.openFact('fact-a');
      await Promise.resolve();
    });

    mockUseWorkspaceVault.mockReturnValue({
      vault: {
        path: '/vaults/beta',
      },
    });
    rerender();

    await act(async () => {
      resolveDetail?.({
        id: 'fact-a',
        text: 'Alpha fact',
        kind: 'manual',
        readOnly: false,
        metadata: null,
        sourceId: null,
      });
      resolveHistory?.({
        factId: 'fact-a',
        entries: [],
      });
      await Promise.resolve();
    });

    expect(result.current.selectedFact).toBeNull();
    expect(result.current.factHistory).toBeNull();
    expect(result.current.factDetailLoading).toBe(false);
  });

  it('debounces graph queries and only applies the latest response', async () => {
    vi.useFakeTimers();
    const queryGraph = vi.fn().mockResolvedValue({
      scope: {
        vaultId: 'vault-1',
        projectId: 'vault-1',
      },
      entities: [],
      relations: [],
      evidenceSummary: {
        observationCount: 0,
        sourceCount: 0,
        memoryFactCount: 0,
        latestObservedAt: null,
      },
    });

    window.desktopAPI = {
      ...window.desktopAPI,
      memory: {
        ...window.desktopAPI?.memory,
        queryGraph,
      },
    } as typeof window.desktopAPI;

    useMemoryWorkbenchStore.setState({ activeTab: 'graph' });
    const { result } = renderHook(() => useMemoryPageState());

    act(() => {
      vi.advanceTimersByTime(180);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(queryGraph).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.setGraphQuery('m');
      result.current.setGraphQuery('mo');
      result.current.setGraphQuery('mor');
    });
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      vi.advanceTimersByTime(179);
    });
    expect(queryGraph).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(queryGraph).toHaveBeenCalledTimes(2);
    expect(queryGraph).toHaveBeenLastCalledWith({ query: 'mor' });
  });
});

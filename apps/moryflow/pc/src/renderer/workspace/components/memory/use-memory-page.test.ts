import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMemoryPage } from './use-memory-page';

const createOverview = (bootstrap?: { pending?: boolean; hasLocalDocuments?: boolean }) => ({
  scope: {
    workspaceId: 'ws-1',
    workspaceName: 'Test',
    localPath: '/test',
    vaultId: null,
    projectId: 'proj-1',
  },
  binding: { loggedIn: true, bound: true },
  bootstrap: {
    pending: false,
    hasLocalDocuments: false,
    ...bootstrap,
  },
  sync: { engineStatus: 'idle', lastSyncAt: null, storageUsedBytes: 0 },
  indexing: {
    sourceCount: 10,
    indexedSourceCount: 10,
    indexingSourceCount: 0,
    attentionSourceCount: 0,
    lastIndexedAt: null,
  },
  facts: { manualCount: 3, derivedCount: 5 },
  graph: {
    entityCount: 2,
    relationCount: 1,
    projectionStatus: 'ready',
    lastProjectedAt: null,
  },
});

const mockMemoryApi = {
  getOverview: vi.fn(),
  listFacts: vi.fn(),
  queryGraph: vi.fn(),
  getKnowledgeStatuses: vi.fn(),
  createFact: vi.fn().mockResolvedValue({
    id: 'new-fact',
    text: 'test',
    kind: 'manual',
    readOnly: false,
    metadata: null,
    categories: [],
    sourceId: null,
    sourceRevisionId: null,
    sourceType: null,
    derivedKey: null,
    expirationDate: null,
    factScope: 'personal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  deleteFact: vi.fn().mockResolvedValue(undefined),
  batchDeleteFacts: vi.fn().mockResolvedValue({ deletedCount: 2 }),
  updateFact: vi.fn().mockResolvedValue({
    id: 'fact-1',
    text: 'updated',
    kind: 'manual',
    readOnly: false,
    metadata: null,
    categories: [],
    sourceId: null,
    sourceRevisionId: null,
    sourceType: null,
    derivedKey: null,
    expirationDate: null,
    factScope: 'personal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  feedbackFact: vi.fn().mockResolvedValue({
    id: 'fb-1',
    feedback: 'positive',
    reason: null,
  }),
  getFactDetail: vi.fn(),
  getFactHistory: vi.fn(),
  getEntityDetail: vi.fn(),
  createExport: vi.fn(),
  getExport: vi.fn(),
};

const flushPromises = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

const flushMicrotasks = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('useMemoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockMemoryApi.getOverview.mockResolvedValue(createOverview());
    mockMemoryApi.listFacts.mockResolvedValue({
      scope: { vaultId: null, projectId: 'proj-1' },
      page: 1,
      pageSize: 30,
      hasMore: false,
      items: [],
    });
    mockMemoryApi.queryGraph.mockResolvedValue({
      scope: { vaultId: null, projectId: 'proj-1' },
      entities: [],
      relations: [],
      evidenceSummary: {
        observationCount: 0,
        sourceCount: 0,
        memoryFactCount: 0,
        latestObservedAt: null,
      },
    });
    mockMemoryApi.getKnowledgeStatuses.mockImplementation(async ({ filter }: { filter?: string }) => ({
      scope: { vaultId: null, projectId: 'proj-1' },
      items:
        filter === 'attention'
          ? [
              {
                documentId: 'doc-attention',
                title: 'Broken doc',
                path: 'notes/broken.md',
                state: 'NEEDS_ATTENTION',
                userFacingReason: 'The latest indexing attempt failed.',
                lastAttemptAt: new Date().toISOString(),
              },
            ]
          : [
              {
                documentId: 'doc-indexing',
                title: 'Draft doc',
                path: 'notes/draft.md',
                state: 'INDEXING',
                userFacingReason: 'Indexing is in progress.',
                lastAttemptAt: new Date().toISOString(),
              },
            ],
    }));
    Object.defineProperty(window, 'desktopAPI', {
      value: { memory: mockMemoryApi },
      writable: true,
      configurable: true,
    });
  });

  it('calls getOverview + listFacts(manual) + queryGraph + getKnowledgeStatuses on mount', async () => {
    const { result } = renderHook(() => useMemoryPage('vault-1'));
    await flushPromises();

    expect(mockMemoryApi.getOverview).toHaveBeenCalled();
    expect(mockMemoryApi.queryGraph).toHaveBeenCalled();
    expect(mockMemoryApi.getKnowledgeStatuses).toHaveBeenCalledWith({ filter: 'attention' });
    expect(mockMemoryApi.getKnowledgeStatuses).toHaveBeenCalledWith({ filter: 'indexing' });

    const listFactsCalls = mockMemoryApi.listFacts.mock.calls;
    const kinds = listFactsCalls.map((c: any[]) => c[0]?.kind);
    expect(kinds).toContain('manual');
    expect(result.current.knowledgeAttentionItems).toHaveLength(1);
    expect(result.current.knowledgeIndexingItems).toHaveLength(1);
    expect(result.current.knowledgeStatusesLoading).toBe(false);
  });

  it('resets state and re-loads when scopeKey changes', async () => {
    const { rerender } = renderHook(({ key }) => useMemoryPage(key), {
      initialProps: { key: 'vault-1' },
    });
    await flushPromises();

    const initialCallCount = mockMemoryApi.getOverview.mock.calls.length;

    rerender({ key: 'vault-2' });
    await flushPromises();

    // After scopeKey change, getOverview should have been called again
    expect(mockMemoryApi.getOverview.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('createFact calls window.desktopAPI.memory.createFact and refreshes', async () => {
    const { result } = renderHook(() => useMemoryPage('vault-1'));
    await flushPromises();

    const overviewCallsBefore = mockMemoryApi.getOverview.mock.calls.length;

    await act(async () => {
      await result.current.createFact('New memory fact');
    });

    expect(mockMemoryApi.createFact).toHaveBeenCalledWith({ text: 'New memory fact' });
    // Refresh should call getOverview again
    expect(mockMemoryApi.getOverview.mock.calls.length).toBeGreaterThan(overviewCallsBefore);
  });

  it('deleteFact calls window.desktopAPI.memory.deleteFact and refreshes', async () => {
    const { result } = renderHook(() => useMemoryPage('vault-1'));
    await flushPromises();

    const overviewCallsBefore = mockMemoryApi.getOverview.mock.calls.length;

    await act(async () => {
      await result.current.deleteFact('fact-to-delete');
    });

    expect(mockMemoryApi.deleteFact).toHaveBeenCalledWith('fact-to-delete');
    expect(mockMemoryApi.getOverview.mock.calls.length).toBeGreaterThan(overviewCallsBefore);
  });

  it('batchDeleteFacts calls batchDeleteFacts API (not individual deletes)', async () => {
    const { result } = renderHook(() => useMemoryPage('vault-1'));
    await flushPromises();

    mockMemoryApi.deleteFact.mockClear();

    await act(async () => {
      await result.current.batchDeleteFacts(['f1', 'f2', 'f3']);
    });

    expect(mockMemoryApi.batchDeleteFacts).toHaveBeenCalledWith({ factIds: ['f1', 'f2', 'f3'] });
    // Individual deleteFact should NOT have been called
    expect(mockMemoryApi.deleteFact).not.toHaveBeenCalled();
  });

  it('does not double-fetch on mount (only one set of API calls)', async () => {
    renderHook(() => useMemoryPage('vault-single'));
    await flushPromises();

    // getOverview should be called exactly once on initial mount
    expect(mockMemoryApi.getOverview).toHaveBeenCalledTimes(1);
    expect(mockMemoryApi.getKnowledgeStatuses).toHaveBeenCalledTimes(2);
    expect(mockMemoryApi.queryGraph).toHaveBeenCalledTimes(1);
  });

  it('polls overview, statuses, and graph while bootstrap is pending, then stops after it settles', async () => {
    vi.useFakeTimers();
    mockMemoryApi.getOverview
      .mockResolvedValueOnce(createOverview({ pending: true, hasLocalDocuments: true }))
      .mockResolvedValue(createOverview({ pending: false, hasLocalDocuments: true }));

    renderHook(() => useMemoryPage('vault-bootstrap'));
    await flushMicrotasks();

    expect(mockMemoryApi.getOverview).toHaveBeenCalledTimes(1);
    expect(mockMemoryApi.getKnowledgeStatuses).toHaveBeenCalledTimes(2);
    expect(mockMemoryApi.queryGraph).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(mockMemoryApi.getOverview).toHaveBeenCalledTimes(2);
    expect(mockMemoryApi.getKnowledgeStatuses).toHaveBeenCalledTimes(4);
    expect(mockMemoryApi.queryGraph).toHaveBeenCalledTimes(2);
    expect(mockMemoryApi.queryGraph).toHaveBeenLastCalledWith({});

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    expect(mockMemoryApi.getOverview).toHaveBeenCalledTimes(2);
    expect(mockMemoryApi.getKnowledgeStatuses).toHaveBeenCalledTimes(4);
    expect(mockMemoryApi.queryGraph).toHaveBeenCalledTimes(2);
  });

  it('preserves the active graph query during bootstrap polling', async () => {
    vi.useFakeTimers();
    mockMemoryApi.getOverview
      .mockResolvedValueOnce(createOverview({ pending: true, hasLocalDocuments: true }))
      .mockResolvedValue(createOverview({ pending: false, hasLocalDocuments: true }));

    const { result } = renderHook(() => useMemoryPage('vault-graph-query'));
    await flushMicrotasks();

    await act(async () => {
      await result.current.loadGraph('alice');
    });

    expect(mockMemoryApi.queryGraph).toHaveBeenLastCalledWith({ query: 'alice' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(mockMemoryApi.queryGraph).toHaveBeenLastCalledWith({ query: 'alice' });
  });

  it('continues bootstrap polling before local document detection finishes', async () => {
    vi.useFakeTimers();
    mockMemoryApi.getOverview
      .mockResolvedValueOnce(createOverview({ pending: true, hasLocalDocuments: false }))
      .mockResolvedValueOnce(createOverview({ pending: true, hasLocalDocuments: true }))
      .mockResolvedValue(createOverview({ pending: false, hasLocalDocuments: true }));

    renderHook(() => useMemoryPage('vault-bootstrap-early'));
    await flushMicrotasks();

    expect(mockMemoryApi.getOverview).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(mockMemoryApi.getOverview).toHaveBeenCalledTimes(2);
    expect(mockMemoryApi.getKnowledgeStatuses).toHaveBeenCalledTimes(4);
    expect(mockMemoryApi.queryGraph).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(mockMemoryApi.getOverview).toHaveBeenCalledTimes(3);
    expect(mockMemoryApi.getKnowledgeStatuses).toHaveBeenCalledTimes(6);
    expect(mockMemoryApi.queryGraph).toHaveBeenCalledTimes(3);
  });

  it('keeps bootstrap polling alive after a transient overview failure', async () => {
    vi.useFakeTimers();
    mockMemoryApi.getOverview
      .mockResolvedValueOnce(createOverview({ pending: true, hasLocalDocuments: true }))
      .mockRejectedValueOnce(new Error('temporary overview failure'))
      .mockResolvedValueOnce(createOverview({ pending: false, hasLocalDocuments: true }));

    renderHook(() => useMemoryPage('vault-bootstrap-retry'));
    await flushMicrotasks();

    expect(mockMemoryApi.getOverview).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(mockMemoryApi.getOverview).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(mockMemoryApi.getOverview).toHaveBeenCalledTimes(3);
  });
});

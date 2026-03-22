import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMemoryPage } from './use-memory-page';

const mockMemoryApi = {
  getOverview: vi.fn().mockResolvedValue({
    scope: {
      workspaceId: 'ws-1',
      workspaceName: 'Test',
      localPath: '/test',
      vaultId: null,
      projectId: 'proj-1',
    },
    binding: { loggedIn: true, bound: true },
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
  }),
  listFacts: vi.fn().mockResolvedValue({
    scope: { vaultId: null, projectId: 'proj-1' },
    page: 1,
    pageSize: 30,
    hasMore: false,
    items: [],
  }),
  queryGraph: vi.fn().mockResolvedValue({
    scope: { vaultId: null, projectId: 'proj-1' },
    entities: [],
    relations: [],
    evidenceSummary: {
      observationCount: 0,
      sourceCount: 0,
      memoryFactCount: 0,
      latestObservedAt: null,
    },
  }),
  getKnowledgeStatuses: vi.fn().mockImplementation(async ({ filter }: { filter?: string }) => ({
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
  })),
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

describe('useMemoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });
});

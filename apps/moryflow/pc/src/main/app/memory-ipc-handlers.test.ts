import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getMemoryOverviewIpc,
  searchMemoryIpc,
  listMemoryFactsIpc,
  getMemoryFactDetailIpc,
  createMemoryFactIpc,
  updateMemoryFactIpc,
  deleteMemoryFactIpc,
  batchUpdateMemoryFactsIpc,
  batchDeleteMemoryFactsIpc,
  getMemoryFactHistoryIpc,
  feedbackMemoryFactIpc,
  queryMemoryGraphIpc,
  getMemoryEntityDetailIpc,
  createMemoryExportIpc,
  getMemoryExportIpc,
  MemoryDesktopApiError,
} from './memory-ipc-handlers';

describe('memory IPC handlers', () => {
  const createDeps = () => ({
    membership: {
      getConfig: vi.fn(() => ({
        token: 'token-1',
        apiUrl: 'https://server.moryflow.com',
      })),
    },
    vault: {
      getActiveVaultInfo: vi.fn(async () => ({
        id: 'workspace-1',
        name: 'Workspace',
        path: '/vaults/workspace',
        addedAt: 1,
      })),
    },
    bindings: {
      readBinding: vi.fn(() => ({
        localPath: '/vaults/workspace',
        vaultId: 'vault-1',
        vaultName: 'Cloud Vault',
        boundAt: 1,
        userId: 'user-1',
      })),
      readSettings: vi.fn(() => ({
        syncEnabled: true,
        deviceId: 'device-1',
        deviceName: 'Mac',
      })),
    },
    engine: {
      getStatus: vi.fn(() => ({
        engineStatus: 'syncing',
        vaultPath: '/vaults/workspace',
        vaultId: 'vault-1',
        pendingCount: 0,
        lastSyncAt: 1234,
      })),
    },
    usage: {
      getUsage: vi.fn(async () => ({
        storage: {
          used: 4096,
          limit: 8192,
          percentage: 50,
        },
        fileLimit: {
          maxFileSize: 10,
        },
        plan: 'pro',
      })),
    },
    fileIndex: {
      getByFileId: vi.fn((_vaultPath: string, fileId: string) =>
        fileId === 'file-1' ? 'Docs/Alpha.md' : null
      ),
    },
    api: {
      getOverview: vi.fn(async () => ({
        scope: {
          vaultId: 'vault-1',
          projectId: 'vault-1',
        },
        indexing: {
          sourceCount: 3,
          indexedSourceCount: 2,
          pendingSourceCount: 1,
          failedSourceCount: 0,
          lastIndexedAt: '2026-03-11T12:00:00.000Z',
        },
        facts: {
          manualCount: 1,
          derivedCount: 2,
        },
        graph: {
          entityCount: 4,
          relationCount: 3,
          projectionStatus: 'building',
          lastProjectedAt: '2026-03-11T12:10:00.000Z',
        },
      })),
      search: vi.fn(async () => ({
        scope: {
          vaultId: 'vault-1',
          projectId: 'vault-1',
        },
        query: 'alpha',
        groups: {
          files: {
            items: [
              {
                id: 'source-result-1',
                fileId: 'file-1',
                vaultId: 'vault-1',
                sourceId: 'source-1',
                title: 'Alpha',
                path: 'Docs/Alpha.md',
                snippet: 'alpha snippet',
                score: 0.9,
              },
            ],
            returnedCount: 1,
            hasMore: false,
          },
          facts: {
            items: [
              {
                id: 'fact-1',
                text: 'remember alpha',
                kind: 'manual',
                readOnly: false,
                metadata: { pinned: true },
                score: 0.8,
                sourceId: null,
              },
            ],
            returnedCount: 1,
            hasMore: false,
          },
        },
      })),
      listFacts: vi.fn(async () => ({
        scope: {
          vaultId: 'vault-1',
          projectId: 'vault-1',
        },
        page: 1,
        pageSize: 20,
        hasMore: false,
        items: [
          {
            id: 'fact-1',
            text: 'remember alpha',
            kind: 'manual',
            readOnly: false,
            metadata: null,
            categories: [],
            sourceId: null,
            sourceRevisionId: null,
            derivedKey: null,
            expirationDate: null,
            createdAt: '2026-03-11T12:00:00.000Z',
            updatedAt: '2026-03-11T12:00:00.000Z',
          },
        ],
      })),
      getFactDetail: vi.fn(async () => ({
        id: 'fact-1',
        text: 'remember alpha',
        kind: 'manual',
        readOnly: false,
        metadata: null,
        categories: [],
        sourceId: null,
        sourceRevisionId: null,
        derivedKey: null,
        expirationDate: null,
        createdAt: '2026-03-11T12:00:00.000Z',
        updatedAt: '2026-03-11T12:00:00.000Z',
      })),
      createFact: vi.fn(async () => ({
        id: 'fact-2',
        text: 'new fact',
        kind: 'manual',
        readOnly: false,
        metadata: null,
        categories: [],
        sourceId: null,
        sourceRevisionId: null,
        derivedKey: null,
        expirationDate: null,
        createdAt: '2026-03-11T12:00:00.000Z',
        updatedAt: '2026-03-11T12:00:00.000Z',
      })),
      updateFact: vi.fn(async () => ({
        id: 'fact-2',
        text: 'updated fact',
        kind: 'manual',
        readOnly: false,
        metadata: null,
        categories: [],
        sourceId: null,
        sourceRevisionId: null,
        derivedKey: null,
        expirationDate: null,
        createdAt: '2026-03-11T12:00:00.000Z',
        updatedAt: '2026-03-11T12:01:00.000Z',
      })),
      deleteFact: vi.fn(async () => undefined),
      batchUpdateFacts: vi.fn(async () => ({ updatedCount: 1 })),
      batchDeleteFacts: vi.fn(async () => ({ deletedCount: 1 })),
      getFactHistory: vi.fn(async () => ({
        scope: {
          vaultId: 'vault-1',
          projectId: 'vault-1',
        },
        items: [],
      })),
      feedbackFact: vi.fn(async () => ({
        id: 'feedback-1',
        feedback: 'positive',
        reason: 'relevant',
      })),
      queryGraph: vi.fn(async () => ({
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
      })),
      getEntityDetail: vi.fn(async () => ({
        entity: {
          id: 'entity-1',
          entityType: 'person',
          canonicalName: 'Alice',
          aliases: [],
          metadata: null,
          lastSeenAt: null,
          incomingRelations: [],
          outgoingRelations: [],
        },
        evidenceSummary: {
          observationCount: 0,
          sourceCount: 0,
          memoryFactCount: 0,
          latestObservedAt: null,
        },
        recentObservations: [],
      })),
      createExport: vi.fn(async () => ({ exportId: 'export-1' })),
      getExport: vi.fn(async () => ({
        scope: {
          vaultId: 'vault-1',
          projectId: 'vault-1',
        },
        items: [],
      })),
    },
  });

  let deps: ReturnType<typeof createDeps>;

  beforeEach(() => {
    deps = createDeps();
  });

  it('aggregates overview from active workspace, binding, sync state and remote gateway', async () => {
    const result = await getMemoryOverviewIpc(deps);

    expect(result).toEqual({
      scope: {
        workspaceId: 'workspace-1',
        workspaceName: 'Workspace',
        localPath: '/vaults/workspace',
        vaultId: 'vault-1',
        projectId: 'vault-1',
      },
      binding: {
        loggedIn: true,
        bound: true,
      },
      sync: {
        engineStatus: 'syncing',
        lastSyncAt: 1234,
        storageUsedBytes: 4096,
      },
      indexing: {
        sourceCount: 3,
        indexedSourceCount: 2,
        pendingSourceCount: 1,
        failedSourceCount: 0,
        lastIndexedAt: '2026-03-11T12:00:00.000Z',
      },
      facts: {
        manualCount: 1,
        derivedCount: 2,
      },
      graph: {
        entityCount: 4,
        relationCount: 3,
        projectionStatus: 'building',
        lastProjectedAt: '2026-03-11T12:10:00.000Z',
      },
    });
    expect(deps.api.getOverview).toHaveBeenCalledTimes(1);
  });

  it('returns a disabled overview without remote requests when the user is not logged in', async () => {
    deps.membership.getConfig.mockReturnValue({
      token: null,
      apiUrl: 'https://server.moryflow.com',
    });

    const result = await getMemoryOverviewIpc(deps);

    expect(result.binding).toEqual({
      loggedIn: false,
      bound: false,
      disabledReason: 'login_required',
    });
    expect(deps.api.getOverview).not.toHaveBeenCalled();
  });

  it('returns a disabled overview without remote requests when the active workspace is not bound', async () => {
    deps.bindings.readBinding.mockReturnValue(null);

    const result = await getMemoryOverviewIpc(deps);

    expect(result.binding).toEqual({
      loggedIn: true,
      bound: false,
      disabledReason: 'vault_not_bound',
    });
    expect(deps.api.getOverview).not.toHaveBeenCalled();
  });

  it('keeps overview available when usage lookup fails', async () => {
    deps.usage.getUsage.mockRejectedValueOnce(new Error('usage unavailable'));

    const result = await getMemoryOverviewIpc(deps);

    expect(result.indexing).toEqual({
      sourceCount: 3,
      indexedSourceCount: 2,
      pendingSourceCount: 1,
      failedSourceCount: 0,
      lastIndexedAt: '2026-03-11T12:00:00.000Z',
    });
    expect(result.sync.storageUsedBytes).toBe(0);
  });

  it('searches memory through the current bound workspace and resolves local file paths', async () => {
    const result = await searchMemoryIpc(deps, {
      query: 'alpha',
      limitPerGroup: 5,
    });

    expect(deps.api.search).toHaveBeenCalledWith({
      vaultId: 'vault-1',
      query: 'alpha',
      limitPerGroup: 5,
      includeGraphContext: false,
    });
    expect(result.groups.files.items).toEqual([
      {
        id: 'source-result-1',
        fileId: 'file-1',
        vaultId: 'vault-1',
        sourceId: 'source-1',
        title: 'Alpha',
        path: 'Docs/Alpha.md',
        localPath: '/vaults/workspace/Docs/Alpha.md',
        disabled: false,
        snippet: 'alpha snippet',
        score: 0.9,
      },
    ]);
  });

  it('delegates facts, graph and export IPCs through the resolved active binding', async () => {
    await listMemoryFactsIpc(deps, { kind: 'manual', page: 1, pageSize: 20 });
    await getMemoryFactDetailIpc(deps, 'fact-1');
    await createMemoryFactIpc(deps, { text: 'new fact' });
    await updateMemoryFactIpc(deps, { factId: 'fact-2', text: 'updated fact' });
    await deleteMemoryFactIpc(deps, 'fact-2');
    await batchUpdateMemoryFactsIpc(deps, {
      facts: [{ factId: 'fact-2', text: 'updated fact' }],
    });
    await batchDeleteMemoryFactsIpc(deps, { factIds: ['fact-2'] });
    await getMemoryFactHistoryIpc(deps, 'fact-1');
    await feedbackMemoryFactIpc(deps, {
      factId: 'fact-1',
      feedback: 'positive',
      reason: 'relevant',
    });
    await queryMemoryGraphIpc(deps, { query: 'alice', limit: 10 });
    await getMemoryEntityDetailIpc(deps, {
      entityId: 'entity-1',
      metadata: {
        topic: 'alpha',
      },
    });
    await createMemoryExportIpc(deps);
    await getMemoryExportIpc(deps, 'export-1');

    expect(deps.api.listFacts).toHaveBeenCalledWith({
      vaultId: 'vault-1',
      kind: 'manual',
      page: 1,
      pageSize: 20,
    });
    expect(deps.api.getFactDetail).toHaveBeenCalledWith({
      vaultId: 'vault-1',
      factId: 'fact-1',
    });
    expect(deps.api.createFact).toHaveBeenCalledWith({
      vaultId: 'vault-1',
      text: 'new fact',
    });
    expect(deps.api.queryGraph).toHaveBeenCalledWith({
      vaultId: 'vault-1',
      query: 'alice',
      limit: 10,
    });
    expect(deps.api.getEntityDetail).toHaveBeenCalledWith({
      vaultId: 'vault-1',
      entityId: 'entity-1',
      metadata: {
        topic: 'alpha',
      },
    });
    expect(deps.api.createExport).toHaveBeenCalledWith({
      vaultId: 'vault-1',
    });
  });

  it('reflects metadata in getEntityDetail dependency typing and runtime call shape', async () => {
    await getMemoryEntityDetailIpc(deps, {
      entityId: 'entity-1',
      metadata: {
        topic: 'alpha',
        nested: {
          level: 'deep',
        },
      },
    });

    expect(deps.api.getEntityDetail).toHaveBeenCalledWith({
      vaultId: 'vault-1',
      entityId: 'entity-1',
      metadata: {
        topic: 'alpha',
        nested: {
          level: 'deep',
        },
      },
    });
  });

  it('fails fast for search when memory is unavailable for the current workspace', async () => {
    deps.bindings.readBinding.mockReturnValue(null);

    await expect(
      searchMemoryIpc(deps, {
        query: 'alpha',
      })
    ).rejects.toBeInstanceOf(MemoryDesktopApiError);
    expect(deps.api.search).not.toHaveBeenCalled();
  });
});

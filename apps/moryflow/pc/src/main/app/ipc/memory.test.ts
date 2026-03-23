import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  batchDeleteMemoryFactsIpc,
  batchUpdateMemoryFactsIpc,
  createMemoryExportIpc,
  createMemoryFactIpc,
  deleteMemoryFactIpc,
  feedbackMemoryFactIpc,
  getMemoryEntityDetailIpc,
  getMemoryExportIpc,
  getMemoryFactDetailIpc,
  getMemoryFactHistoryIpc,
  listMemoryFactsIpc,
  queryMemoryGraphIpc,
  searchMemoryIpc,
  updateMemoryFactIpc,
} from './memory-domain/facts.js';
import { readWorkspaceFileIpc } from './memory-domain/knowledge-read.js';
import { getKnowledgeStatusesIpc } from './memory-domain/knowledge-statuses.js';
import { getMemoryOverviewIpc } from './memory-domain/overview.js';
import { MemoryDesktopApiError } from './memory-domain/shared.js';

describe('memory IPC handlers', () => {
  const createDeps = () => ({
    profiles: {
      resolveActiveProfile: vi.fn(async () => ({
        loggedIn: true,
        activeVault: {
          id: 'local-workspace-1',
          name: 'Workspace',
          path: '/vaults/workspace',
          addedAt: 1,
        },
        profile: {
          workspaceId: 'workspace-1',
          memoryProjectId: 'workspace-1',
          syncVaultId: 'vault-1',
          syncEnabled: true,
          lastResolvedAt: '2026-03-11T12:00:00.000Z',
        },
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
    memoryIndexing: {
      getBootstrapState: vi.fn(() => ({
        pending: false,
        hasLocalDocuments: false,
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
    documentRegistry: {
      getAll: vi.fn(async () => []),
      getByDocumentId: vi.fn(async (_vaultPath: string, documentId: string) =>
        documentId === 'document-1'
          ? {
              documentId,
              path: 'Docs/Alpha.md',
              fingerprint: 'fp-1',
            }
          : null
      ),
      getByPath: vi.fn(async (_vaultPath: string, relativePath: string) =>
        relativePath === 'Docs/Alpha.md'
          ? {
              documentId: 'document-1',
              path: relativePath,
              fingerprint: 'fp-1',
            }
          : null
        ),
    },
    api: {
      getOverview: vi.fn(async () => ({
        scope: {
          workspaceId: 'workspace-1',
          projectId: 'workspace-1',
          syncVaultId: 'vault-1',
        },
        projection: {
          pending: false,
          unresolvedEventCount: 0,
        },
        indexing: {
          sourceCount: 3,
          indexedSourceCount: 2,
          indexingSourceCount: 1,
          attentionSourceCount: 0,
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
      getKnowledgeStatuses: vi.fn(async () => ({
        scope: {
          workspaceId: 'workspace-1',
          projectId: 'workspace-1',
          syncVaultId: 'vault-1',
        },
        items: [
          {
            documentId: 'document-1',
            title: 'Alpha',
            path: 'Docs/Alpha.md',
            state: 'NEEDS_ATTENTION',
            userFacingReason: 'This file could not be indexed yet.',
            lastAttemptAt: '2026-03-11T12:30:00.000Z',
          },
        ],
      })),
      search: vi.fn(async () => ({
        scope: {
          workspaceId: 'workspace-1',
          projectId: 'workspace-1',
          syncVaultId: 'vault-1',
        },
        query: 'alpha',
        groups: {
          files: {
            items: [
              {
                id: 'source-result-1',
                documentId: 'document-1',
                workspaceId: 'workspace-1',
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
          workspaceId: 'workspace-1',
          projectId: 'workspace-1',
          syncVaultId: 'vault-1',
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
          workspaceId: 'workspace-1',
          projectId: 'workspace-1',
          syncVaultId: 'vault-1',
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
          workspaceId: 'workspace-1',
          projectId: 'workspace-1',
          syncVaultId: 'vault-1',
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
          workspaceId: 'workspace-1',
          projectId: 'workspace-1',
          syncVaultId: 'vault-1',
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
    deps.memoryIndexing.getBootstrapState.mockReturnValue({
      pending: true,
      hasLocalDocuments: true,
    });

    const result = await getMemoryOverviewIpc(deps);

    expect(result).toEqual({
      scope: {
        workspaceId: 'workspace-1',
        workspaceName: 'Workspace',
        localPath: '/vaults/workspace',
        vaultId: 'vault-1',
        projectId: 'workspace-1',
      },
      binding: {
        loggedIn: true,
        bound: true,
      },
      bootstrap: {
        pending: true,
        hasLocalDocuments: true,
      },
      sync: {
        engineStatus: 'syncing',
        lastSyncAt: 1234,
        storageUsedBytes: 4096,
      },
      projection: {
        pending: false,
        unresolvedEventCount: 0,
      },
      indexing: {
        sourceCount: 3,
        indexedSourceCount: 2,
        indexingSourceCount: 1,
        attentionSourceCount: 0,
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
    deps.profiles.resolveActiveProfile.mockResolvedValue({
      loggedIn: false,
      activeVault: {
        id: 'local-workspace-1',
        name: 'Workspace',
        path: '/vaults/workspace',
        addedAt: 1,
      },
      profile: null,
    });

    const result = await getMemoryOverviewIpc(deps);

    expect(result.binding).toEqual({
      loggedIn: false,
      bound: false,
      disabledReason: 'login_required',
    });
    expect(result.bootstrap).toEqual({
      pending: false,
      hasLocalDocuments: false,
    });
    expect((result as { projection?: unknown }).projection).toEqual({
      pending: false,
      unresolvedEventCount: 0,
    });
    expect(result.graph.projectionStatus).toBe('disabled');
    expect(deps.api.getOverview).not.toHaveBeenCalled();
  });

  it('returns a disabled overview without remote requests when the active workspace profile is unavailable', async () => {
    deps.profiles.resolveActiveProfile.mockResolvedValue({
      loggedIn: true,
      activeVault: {
        id: 'local-workspace-1',
        name: 'Workspace',
        path: '/vaults/workspace',
        addedAt: 1,
      },
      profile: null,
    });

    const result = await getMemoryOverviewIpc(deps);

    expect(result.binding).toEqual({
      loggedIn: true,
      bound: false,
      disabledReason: 'profile_unavailable',
    });
    expect(result.bootstrap).toEqual({
      pending: false,
      hasLocalDocuments: false,
    });
    expect((result as { projection?: unknown }).projection).toEqual({
      pending: false,
      unresolvedEventCount: 0,
    });
    expect(result.graph.projectionStatus).toBe('disabled');
    expect(deps.api.getOverview).not.toHaveBeenCalled();
  });

  it('keeps overview available when usage lookup fails', async () => {
    deps.usage.getUsage.mockRejectedValueOnce(new Error('usage unavailable'));

    const result = await getMemoryOverviewIpc(deps);

    expect(result.indexing).toEqual({
      sourceCount: 3,
      indexedSourceCount: 2,
      indexingSourceCount: 1,
      attentionSourceCount: 0,
      lastIndexedAt: '2026-03-11T12:00:00.000Z',
    });
    expect(result.sync.storageUsedBytes).toBe(0);
  });

  it('does not treat retained registry tombstones as local documents for bootstrap hint', async () => {
    deps.documentRegistry.getAll.mockResolvedValue([
      {
        documentId: 'document-1',
        path: 'Docs/Deleted.md',
        fingerprint: 'fp-deleted',
      },
    ]);
    deps.memoryIndexing.getBootstrapState.mockReturnValue({
      pending: true,
      hasLocalDocuments: false,
    });

    const result = await getMemoryOverviewIpc(deps);

    expect(result.bootstrap).toEqual({
      pending: true,
      hasLocalDocuments: false,
    });
  });

  it('fills a default projection shape when an overview producer omits projection data', async () => {
    deps.api.getOverview.mockResolvedValueOnce({
      scope: {
        workspaceId: 'workspace-1',
        projectId: 'workspace-1',
        syncVaultId: 'vault-1',
      },
      indexing: {
        sourceCount: 0,
        indexedSourceCount: 0,
        indexingSourceCount: 0,
        attentionSourceCount: 0,
        lastIndexedAt: null,
      },
      facts: {
        manualCount: 0,
        derivedCount: 0,
      },
      graph: {
        entityCount: 0,
        relationCount: 0,
        projectionStatus: 'idle',
        lastProjectedAt: null,
      },
    } as never);

    const result = await getMemoryOverviewIpc(deps);

    expect((result as { projection?: unknown }).projection).toEqual({
      pending: false,
      unresolvedEventCount: 0,
    });
  });

  it('preserves the remote projection backlog hint in the renderer overview contract', async () => {
    deps.api.getOverview.mockResolvedValueOnce({
      scope: {
        workspaceId: 'workspace-1',
        projectId: 'workspace-1',
        syncVaultId: 'vault-1',
      },
      projection: {
        pending: true,
        unresolvedEventCount: 3,
      },
      indexing: {
        sourceCount: 0,
        indexedSourceCount: 0,
        indexingSourceCount: 0,
        attentionSourceCount: 0,
        lastIndexedAt: null,
      },
      facts: {
        manualCount: 0,
        derivedCount: 0,
      },
      graph: {
        entityCount: 0,
        relationCount: 0,
        projectionStatus: 'idle',
        lastProjectedAt: null,
      },
    });

    const result = await getMemoryOverviewIpc(deps);

    expect((result as { projection?: unknown }).projection).toEqual({
      pending: true,
      unresolvedEventCount: 3,
    });
  });

  it('queries file-level knowledge statuses through the current workspace binding', async () => {
    const result = await getKnowledgeStatusesIpc(deps, {
      filter: 'attention',
    });

    expect(deps.api.getKnowledgeStatuses).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      filter: 'attention',
    });
    expect(result).toEqual({
      scope: {
        vaultId: 'vault-1',
        projectId: 'workspace-1',
      },
      items: [
        {
          documentId: 'document-1',
          title: 'Alpha',
          path: 'Docs/Alpha.md',
          state: 'NEEDS_ATTENTION',
          userFacingReason: 'This file could not be indexed yet.',
          lastAttemptAt: '2026-03-11T12:30:00.000Z',
        },
      ],
    });
  });

  it('searches memory through the current bound workspace and resolves local file paths', async () => {
    const result = await searchMemoryIpc(deps, {
      query: 'alpha',
      limitPerGroup: 5,
    });

    expect(deps.api.search).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      query: 'alpha',
      limitPerGroup: 5,
      includeGraphContext: false,
    });
    expect(result.groups.files.items).toEqual([
      {
        id: 'source-result-1',
        fileId: 'document-1',
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
    await getMemoryEntityDetailIpc(deps, { entityId: 'entity-1' });
    await createMemoryExportIpc(deps);
    await getMemoryExportIpc(deps, 'export-1');

    expect(deps.api.listFacts).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      kind: 'manual',
      page: 1,
      pageSize: 20,
    });
    expect(deps.api.getFactDetail).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      factId: 'fact-1',
    });
    expect(deps.api.createFact).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      text: 'new fact',
    });
    expect(deps.api.queryGraph).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      query: 'alice',
      limit: 10,
    });
    expect(deps.api.getEntityDetail).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      entityId: 'entity-1',
    });
    expect(deps.api.createExport).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
    });
  });

  it('uses workspace-bound graph entity detail without legacy metadata filters', async () => {
    await getMemoryEntityDetailIpc(deps, { entityId: 'entity-1' });

    expect(deps.api.getEntityDetail).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      entityId: 'entity-1',
    });
  });

  it('fails fast for search when memory is unavailable for the current workspace', async () => {
    deps.profiles.resolveActiveProfile.mockResolvedValue({
      loggedIn: true,
      activeVault: {
        id: 'local-workspace-1',
        name: 'Workspace',
        path: '/vaults/workspace',
        addedAt: 1,
      },
      profile: null,
    });

    await expect(
      searchMemoryIpc(deps, {
        query: 'alpha',
      })
    ).rejects.toBeInstanceOf(MemoryDesktopApiError);
    expect(deps.api.search).not.toHaveBeenCalled();
  });

  it('fails closed when documentId is provided but not found, even if path exists', async () => {
    const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'memory-read-'));
    await mkdir(path.join(vaultPath, 'Docs'), { recursive: true });
    await writeFile(path.join(vaultPath, 'Docs/Alpha.md'), '# Alpha\n');

    deps.profiles.resolveActiveProfile.mockResolvedValue({
      loggedIn: true,
      activeVault: {
        id: 'local-workspace-1',
        name: 'Workspace',
        path: vaultPath,
        addedAt: 1,
      },
      profile: {
        workspaceId: 'workspace-1',
        memoryProjectId: 'workspace-1',
        syncVaultId: 'vault-1',
        syncEnabled: true,
        lastResolvedAt: '2026-03-11T12:00:00.000Z',
      },
    });
    deps.documentRegistry.getByDocumentId.mockResolvedValue(null);

    await expect(
      readWorkspaceFileIpc(deps, {
        documentId: 'missing-document',
        path: 'Docs/Alpha.md',
      })
    ).rejects.toBeInstanceOf(MemoryDesktopApiError);
    expect(deps.documentRegistry.getByPath).not.toHaveBeenCalled();
  });

  it('reads extensionless whitelist files such as Dockerfile via path fallback', async () => {
    const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'memory-read-'));
    await writeFile(path.join(vaultPath, 'Dockerfile'), 'FROM node:22-alpine\n');

    deps.profiles.resolveActiveProfile.mockResolvedValue({
      loggedIn: true,
      activeVault: {
        id: 'local-workspace-1',
        name: 'Workspace',
        path: vaultPath,
        addedAt: 1,
      },
      profile: {
        workspaceId: 'workspace-1',
        memoryProjectId: 'workspace-1',
        syncVaultId: 'vault-1',
        syncEnabled: true,
        lastResolvedAt: '2026-03-11T12:00:00.000Z',
      },
    });
    deps.documentRegistry.getByPath.mockResolvedValue({
      documentId: 'dockerfile-doc',
      path: 'Dockerfile',
      fingerprint: 'fp-docker',
    });

    await expect(
      readWorkspaceFileIpc(deps, {
        path: 'Dockerfile',
      })
    ).resolves.toMatchObject({
      content: 'FROM node:22-alpine\n',
      mimeType: 'text/plain',
      relativePath: 'Dockerfile',
    });
  });

  it('paginates knowledge_read by Unicode code points without splitting surrogate pairs', async () => {
    const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'memory-read-'));
    await mkdir(path.join(vaultPath, 'Docs'), { recursive: true });
    await writeFile(path.join(vaultPath, 'Docs/Unicode.md'), 'A𠀋BC');

    deps.profiles.resolveActiveProfile.mockResolvedValue({
      loggedIn: true,
      activeVault: {
        id: 'local-workspace-1',
        name: 'Workspace',
        path: vaultPath,
        addedAt: 1,
      },
      profile: {
        workspaceId: 'workspace-1',
        memoryProjectId: 'workspace-1',
        syncVaultId: 'vault-1',
        syncEnabled: true,
        lastResolvedAt: '2026-03-11T12:00:00.000Z',
      },
    });
    deps.documentRegistry.getByPath.mockResolvedValue({
      documentId: 'unicode-doc',
      path: 'Docs/Unicode.md',
      fingerprint: 'fp-unicode',
    });

    const firstPage = await readWorkspaceFileIpc(deps, {
      path: 'Docs/Unicode.md',
      offsetChars: 0,
      maxChars: 2,
    });
    const secondPage = await readWorkspaceFileIpc(deps, {
      path: 'Docs/Unicode.md',
      offsetChars: firstPage.nextOffset ?? 0,
      maxChars: 2,
    });

    expect(firstPage.content).toBe('A𠀋');
    expect(firstPage.nextOffset).toBe(2);
    expect(secondPage.content).toBe('BC');
    expect(secondPage.nextOffset).toBeNull();
  });
});

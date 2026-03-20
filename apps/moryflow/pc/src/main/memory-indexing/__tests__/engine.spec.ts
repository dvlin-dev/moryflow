/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';

vi.mock('../../vault/index.js', () => ({
  getActiveVaultInfo: vi.fn(async () => null),
}));

vi.mock('../../membership-bridge.js', () => ({
  membershipBridge: {
    getConfig: () => ({
      token: null,
      apiUrl: 'https://server.moryflow.com',
    }),
  },
}));

vi.mock('../../cloud-sync/user-info.js', () => ({
  fetchCurrentUserId: vi.fn(async () => null),
}));

vi.mock('../../workspace-meta/identity.js', () => ({
  ensureWorkspaceIdentity: vi.fn(async () => ({
    clientWorkspaceId: 'client-workspace-1',
    createdAt: '2026-03-14T00:00:00.000Z',
  })),
}));

vi.mock('../../workspace-profile/api/client.js', () => ({
  workspaceProfileApi: {
    resolveWorkspace: vi.fn(async () => ({
      workspaceId: 'workspace-1',
      memoryProjectId: 'workspace-1',
      syncVaultId: null,
      syncEnabled: false,
    })),
  },
}));

import { createMemoryIndexingEngine } from '../engine.js';
import { createMemoryIndexingState } from '../state.js';

describe('memoryIndexingEngine', () => {
  const resolveActiveProfileMock = vi.fn();
  const ensureDocumentIdMock = vi.fn();
  const getByPathMock = vi.fn();
  const getByDocumentIdMock = vi.fn();
  const deleteRegistryEntryMock = vi.fn();
  const getSyncMirrorEntryMock = vi.fn();
  const batchUpsertMock = vi.fn();
  const batchDeleteMock = vi.fn();
  const readTextMock = vi.fn();
  const contentText = '# Hello';
  const contentHash = crypto.createHash('sha256').update(contentText).digest('hex');

  const createEngine = () =>
    createMemoryIndexingEngine({
      profiles: {
        resolveActiveProfile: resolveActiveProfileMock,
      },
      documentRegistry: {
        ensureDocumentId: ensureDocumentIdMock,
        getByPath: getByPathMock,
        getByDocumentId: getByDocumentIdMock,
        delete: deleteRegistryEntryMock,
      },
      syncMirror: {
        getEntry: getSyncMirrorEntryMock,
      },
      api: {
        batchUpsert: batchUpsertMock,
        batchDelete: batchDeleteMock,
      },
      files: {
        readText: readTextMock,
      },
      state: createMemoryIndexingState(),
    });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    resolveActiveProfileMock.mockResolvedValue({
      loggedIn: true,
      activeVault: {
        id: 'vault-local',
        name: 'Workspace',
        path: '/vault',
        addedAt: 1,
      },
      userId: 'user-1',
      identity: {
        clientWorkspaceId: 'client-workspace-1',
        createdAt: '2026-03-14T00:00:00.000Z',
      },
      profileKey: 'user-1:client-workspace-1',
      profile: {
        workspaceId: 'workspace-1',
        memoryProjectId: 'workspace-1',
        syncVaultId: null,
        syncEnabled: false,
        lastResolvedAt: '2026-03-14T00:00:00.000Z',
      },
    });
    ensureDocumentIdMock.mockResolvedValue('document-1');
    getByPathMock.mockResolvedValue({
      documentId: 'document-1',
      path: 'notes/hello.md',
      fingerprint: 'fp-1',
    });
    getByDocumentIdMock.mockResolvedValue(null);
    deleteRegistryEntryMock.mockResolvedValue('document-1');
    getSyncMirrorEntryMock.mockReturnValue(null);
    readTextMock.mockResolvedValue(contentText);
    batchUpsertMock.mockResolvedValue({
      workspaceId: 'workspace-1',
      processedCount: 1,
      revisionCreatedCount: 1,
    });
    batchDeleteMock.mockResolvedValue({
      workspaceId: 'workspace-1',
      processedCount: 1,
      deletedCount: 1,
    });
  });

  it('uploads inline_text when sync is not enabled', async () => {
    const engine = createEngine();

    engine.handleFileChange('change', '/vault/notes/hello.md');
    await vi.advanceTimersByTimeAsync(2_000);

    expect(batchUpsertMock).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      documents: [
        expect.objectContaining({
          documentId: 'document-1',
          path: 'notes/hello.md',
          mode: 'inline_text',
          contentText,
        }),
      ],
    });
  });

  it('uploads sync_object_ref when sync mirror matches the current content', async () => {
    resolveActiveProfileMock.mockResolvedValue({
      loggedIn: true,
      activeVault: {
        id: 'vault-local',
        name: 'Workspace',
        path: '/vault',
        addedAt: 1,
      },
      userId: 'user-1',
      identity: {
        clientWorkspaceId: 'client-workspace-1',
        createdAt: '2026-03-14T00:00:00.000Z',
      },
      profileKey: 'user-1:client-workspace-1',
      profile: {
        workspaceId: 'workspace-1',
        memoryProjectId: 'workspace-1',
        syncVaultId: 'sync-vault-1',
        syncEnabled: true,
        lastResolvedAt: '2026-03-14T00:00:00.000Z',
      },
    });
    getSyncMirrorEntryMock.mockReturnValue({
      lastSyncedHash: contentHash,
      lastSyncedStorageRevision: 'storage-rev-1',
    });
    const engine = createEngine();

    engine.handleFileChange('change', '/vault/notes/hello.md');
    await vi.advanceTimersByTimeAsync(2_000);

    expect(batchUpsertMock).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      documents: [
        expect.objectContaining({
          documentId: 'document-1',
          path: 'notes/hello.md',
          mode: 'sync_object_ref',
          vaultId: 'sync-vault-1',
          fileId: 'document-1',
          storageRevision: 'storage-rev-1',
        }),
      ],
    });
  });

  it('debounces multiple changes for the same document within 2 seconds', async () => {
    const engine = createEngine();

    engine.handleFileChange('change', '/vault/notes/hello.md');
    await vi.advanceTimersByTimeAsync(1_000);
    engine.handleFileChange('change', '/vault/notes/hello.md');
    await vi.advanceTimersByTimeAsync(1_500);

    expect(batchUpsertMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(batchUpsertMock).toHaveBeenCalledTimes(1);
  });

  it('retries failed uploads up to 3 times', async () => {
    batchUpsertMock
      .mockRejectedValueOnce(new Error('network-1'))
      .mockRejectedValueOnce(new Error('network-2'))
      .mockRejectedValueOnce(new Error('network-3'))
      .mockResolvedValueOnce({
        workspaceId: 'workspace-1',
        processedCount: 1,
        revisionCreatedCount: 1,
      });
    const engine = createEngine();

    engine.handleFileChange('change', '/vault/notes/hello.md');
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(2_000);

    expect(batchUpsertMock).toHaveBeenCalledTimes(4);
  });

  it('deletes source-derived content when a markdown file is removed', async () => {
    const engine = createEngine();

    engine.handleFileChange('unlink', '/vault/notes/hello.md');
    await vi.advanceTimersByTimeAsync(2_000);

    expect(batchDeleteMock).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      documents: [{ documentId: 'document-1' }],
    });
  });

  it('re-uploads metadata when the file is renamed without content changes', async () => {
    const engine = createEngine();

    engine.handleFileChange('change', '/vault/notes/hello.md');
    await vi.advanceTimersByTimeAsync(2_000);

    ensureDocumentIdMock.mockResolvedValueOnce('document-1');
    engine.handleFileChange('add', '/vault/archive/hello.md');
    await vi.advanceTimersByTimeAsync(2_000);

    expect(batchUpsertMock).toHaveBeenNthCalledWith(2, {
      workspaceId: 'workspace-1',
      documents: [
        expect.objectContaining({
          documentId: 'document-1',
          path: 'archive/hello.md',
          title: 'hello',
        }),
      ],
    });
  });

  it('cancels the scheduled upload when account context changes before flush', async () => {
    const engine = createEngine();

    engine.handleFileChange('change', '/vault/notes/hello.md');
    await vi.advanceTimersByTimeAsync(1_000);

    resolveActiveProfileMock.mockResolvedValue({
      loggedIn: true,
      activeVault: {
        id: 'vault-local',
        name: 'Workspace',
        path: '/vault',
        addedAt: 1,
      },
      userId: 'user-2',
      identity: {
        clientWorkspaceId: 'client-workspace-1',
        createdAt: '2026-03-14T00:00:00.000Z',
      },
      profileKey: 'user-2:client-workspace-1',
      profile: {
        workspaceId: 'workspace-2',
        memoryProjectId: 'workspace-2',
        syncVaultId: null,
        syncEnabled: false,
        lastResolvedAt: '2026-03-14T00:00:00.000Z',
      },
    });

    await vi.advanceTimersByTimeAsync(1_000);

    expect(batchUpsertMock).not.toHaveBeenCalled();
  });

  it('cancels pending retries after stop', async () => {
    batchUpsertMock.mockRejectedValueOnce(new Error('network-down'));
    const engine = createEngine();

    engine.handleFileChange('change', '/vault/notes/hello.md');
    await vi.advanceTimersByTimeAsync(2_000);
    engine.stop();
    await vi.advanceTimersByTimeAsync(2_000);

    expect(batchUpsertMock).toHaveBeenCalledTimes(1);
  });
});

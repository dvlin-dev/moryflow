/* @vitest-environment node */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';

vi.mock(
  '@moryflow/sync',
  () => ({
    normalizeSyncPath: (value: string) => value.replace(/\\/g, '/'),
  }),
  { virtual: true }
);

vi.mock(
  '@moryflow/api',
  () => ({
    createApiClient: vi.fn(),
    createApiTransport: vi.fn(),
    ServerApiError: class extends Error {},
    MEMBERSHIP_API_URL: 'https://server.moryflow.com',
    USER_API: {},
  }),
  { virtual: true }
);

vi.mock(
  'electron',
  () => ({
    app: {},
    ipcMain: {},
  }),
  { virtual: true }
);

vi.mock(
  'electron-store',
  () => ({
    default: class MockStore {
      get() {
        return null;
      }
      set() {}
      delete() {}
    },
  }),
  { virtual: true }
);

vi.mock('../../vault/index.js', () => ({
  getActiveVaultInfo: vi.fn(async () => null),
}));

vi.mock('../../membership/bridge.js', () => ({
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

vi.mock('../../workspace-profile/service.js', () => ({
  workspaceProfileService: {
    getProfile: vi.fn(() => null),
    saveProfile: vi.fn(),
  },
  buildWorkspaceProfileKey: vi.fn(
    (userId: string, clientWorkspaceId: string) => `${userId}:${clientWorkspaceId}`
  ),
}));

let createMemoryIndexingEngine: (typeof import('../engine.js'))['createMemoryIndexingEngine'];
let createMemoryIndexingState: (typeof import('../state.js'))['createMemoryIndexingState'];
let WorkspaceContentApiError: typeof import('../api/client.js').WorkspaceContentApiError;

beforeAll(async () => {
  ({ createMemoryIndexingEngine } = await import('../engine.js'));
  ({ createMemoryIndexingState } = await import('../state.js'));
  ({ WorkspaceContentApiError } = await import('../api/client.js'));
});

describe('memoryIndexingEngine', () => {
  const resolveActiveProfileMock = vi.fn();
  const ensureDocumentIdMock = vi.fn();
  const getByPathMock = vi.fn();
  const getByDocumentIdMock = vi.fn();
  const deleteRegistryEntryMock = vi.fn();
  const getSyncMirrorEntryMock = vi.fn();
  const markUploadedDocumentMock = vi.fn();
  const removeUploadedDocumentMock = vi.fn();
  const batchUpsertMock = vi.fn();
  const batchDeleteMock = vi.fn();
  const readTextMock = vi.fn();
  const contentText = '# Hello';
  const contentHash = crypto.createHash('sha256').update(contentText).digest('hex');

  const createEngine = (state = createMemoryIndexingState()) =>
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
      uploadedDocuments: {
        markUploadedDocument: markUploadedDocumentMock,
        removeUploadedDocument: removeUploadedDocumentMock,
      },
      api: {
        batchUpsert: batchUpsertMock,
        batchDelete: batchDeleteMock,
      },
      files: {
        readText: readTextMock,
      },
      state,
    } as any);

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
    markUploadedDocumentMock.mockResolvedValue(undefined);
    removeUploadedDocumentMock.mockResolvedValue(undefined);
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

  it('tracks bootstrap pending state per vault path', () => {
    const state = createMemoryIndexingState();

    expect(state.getBootstrapState('/vault')).toEqual({
      pending: false,
      hasLocalDocuments: false,
    });

    const run = state.markBootstrapStarted('/vault');
    state.markBootstrapDocuments('/vault', run, true);
    expect(state.getBootstrapState('/vault')).toEqual({
      pending: true,
      hasLocalDocuments: true,
    });

    state.markBootstrapFinished('/vault', run);
    expect(state.getBootstrapState('/vault')).toEqual({
      pending: false,
      hasLocalDocuments: true,
    });
  });

  it('keeps bootstrap pending until the last overlapping reconcile finishes', () => {
    const state = createMemoryIndexingState();
    const firstRun = state.markBootstrapStarted('/vault');
    const secondRun = state.markBootstrapStarted('/vault');

    state.markBootstrapFinished('/vault', firstRun);

    expect(state.getBootstrapState('/vault')).toEqual({
      pending: true,
      hasLocalDocuments: false,
    });

    state.markBootstrapFinished('/vault', secondRun);

    expect(state.getBootstrapState('/vault')).toEqual({
      pending: false,
      hasLocalDocuments: false,
    });
  });

  it('reset only clears bootstrap state for the current state instance', () => {
    const firstState = createMemoryIndexingState();
    const secondState = createMemoryIndexingState();

    firstState.markBootstrapStarted('/vault');
    secondState.reset();

    expect(firstState.getBootstrapState('/vault')).toEqual({
      pending: true,
      hasLocalDocuments: false,
    });
  });

  it('reset clears committed remote upload and delete markers', () => {
    const state = createMemoryIndexingState();

    state.markRemoteUploaded('task-upload', 'sig-upload');
    state.markRemoteDeleted('task-delete');

    expect(state.getLastUploadedSignature('task-upload')).toBe('sig-upload');
    expect(state.hasRemoteDelete('task-delete')).toBe(true);

    state.reset();

    expect(state.getLastUploadedSignature('task-upload')).toBeNull();
    expect(state.hasRemoteDelete('task-delete')).toBe(false);
  });

  it('ignores stale bootstrap finish after reset when a new run has already started', () => {
    const state = createMemoryIndexingState();
    const staleRun = state.markBootstrapStarted('/vault');

    state.reset();

    const activeRun = state.markBootstrapStarted('/vault');
    state.markBootstrapFinished('/vault', staleRun);

    expect(state.getBootstrapState('/vault')).toEqual({
      pending: true,
      hasLocalDocuments: false,
    });

    state.markBootstrapFinished('/vault', activeRun);

    expect(state.getBootstrapState('/vault')).toEqual({
      pending: false,
      hasLocalDocuments: false,
    });
  });

  it('ignores stale bootstrap document hints after reset when a new run has already started', () => {
    const state = createMemoryIndexingState();
    const staleRun = state.markBootstrapStarted('/vault');

    state.reset();

    const activeRun = state.markBootstrapStarted('/vault');
    state.markBootstrapDocuments('/vault', staleRun, true);

    expect(state.getBootstrapState('/vault')).toEqual({
      pending: true,
      hasLocalDocuments: false,
    });

    state.markBootstrapDocuments('/vault', activeRun, true);

    expect(state.getBootstrapState('/vault')).toEqual({
      pending: true,
      hasLocalDocuments: true,
    });
  });

  it('keeps bootstrap pending while local indexing work is still queued after bootstrap scan ends', () => {
    const state = createMemoryIndexingState();
    const run = state.markBootstrapStarted('/vault');

    state.markBootstrapDocuments('/vault', run, true);
    state.schedule('task-1', () => undefined, '/vault/notes/a.md', '/vault');
    state.markBootstrapFinished('/vault', run);

    expect(state.getBootstrapState('/vault')).toEqual({
      pending: true,
      hasLocalDocuments: true,
    });

    state.markUploaded('task-1', 'sig-1');

    expect(state.getBootstrapState('/vault')).toEqual({
      pending: false,
      hasLocalDocuments: true,
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
    expect(markUploadedDocumentMock).toHaveBeenCalledWith(
      '/vault',
      'user-1:client-workspace-1',
      'workspace-1',
      'document-1'
    );
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

  it('retries uploaded-document persistence without repeating batchUpsert', async () => {
    markUploadedDocumentMock
      .mockRejectedValueOnce(new Error('disk-full'))
      .mockResolvedValueOnce(undefined);
    const engine = createEngine();

    engine.handleFileChange('change', '/vault/notes/hello.md');
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(500);

    expect(batchUpsertMock).toHaveBeenCalledTimes(1);
    expect(markUploadedDocumentMock).toHaveBeenCalledTimes(2);
  });

  it('resets bootstrap pending when uploaded-document persistence retries are exhausted', async () => {
    const state = createMemoryIndexingState();
    markUploadedDocumentMock.mockRejectedValue(new Error('disk-full'));
    const engine = createEngine(state);

    engine.handleFileChange('change', '/vault/notes/hello.md');

    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(2_000);

    expect(batchUpsertMock).toHaveBeenCalledTimes(1);
    expect(markUploadedDocumentMock).toHaveBeenCalledTimes(4);
    expect(state.getBootstrapState('/vault')).toEqual({
      pending: false,
      hasLocalDocuments: false,
    });
  });

  it('retries local persistence after sync fallback without repeating batchUpsert', async () => {
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
    batchUpsertMock
      .mockRejectedValueOnce(new WorkspaceContentApiError('stale revision', 409, 'CONFLICT'))
      .mockResolvedValueOnce({
        workspaceId: 'workspace-1',
        processedCount: 1,
        revisionCreatedCount: 1,
      });
    markUploadedDocumentMock
      .mockRejectedValueOnce(new Error('disk-full'))
      .mockResolvedValueOnce(undefined);

    const engine = createEngine();

    engine.handleFileChange('change', '/vault/notes/hello.md');
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(500);

    expect(batchUpsertMock).toHaveBeenCalledTimes(2);
    expect(batchUpsertMock).toHaveBeenNthCalledWith(1, {
      workspaceId: 'workspace-1',
      documents: [
        expect.objectContaining({
          documentId: 'document-1',
          path: 'notes/hello.md',
          mode: 'sync_object_ref',
        }),
      ],
    });
    expect(batchUpsertMock).toHaveBeenNthCalledWith(2, {
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
    expect(markUploadedDocumentMock).toHaveBeenCalledTimes(2);
  });

  it('does not clean up committed fallback uploads when local persistence retries are exhausted', async () => {
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
    batchUpsertMock
      .mockRejectedValueOnce(new WorkspaceContentApiError('stale revision', 409, 'CONFLICT'))
      .mockResolvedValueOnce({
        workspaceId: 'workspace-1',
        processedCount: 1,
        revisionCreatedCount: 1,
      });
    markUploadedDocumentMock.mockRejectedValue(new Error('disk-full'));
    const engine = createEngine();

    engine.handleFileChange('change', '/vault/notes/hello.md');

    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(2_000);

    expect(batchUpsertMock).toHaveBeenCalledTimes(2);
    expect(batchDeleteMock).not.toHaveBeenCalled();
    expect(markUploadedDocumentMock).toHaveBeenCalledTimes(4);
  });

  it('deletes source-derived content when a markdown file is removed', async () => {
    const engine = createEngine();

    engine.handleFileChange('unlink', '/vault/notes/hello.md');
    await vi.advanceTimersByTimeAsync(2_000);

    expect(batchDeleteMock).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      documents: [{ documentId: 'document-1' }],
    });
    expect(removeUploadedDocumentMock).toHaveBeenCalledWith(
      '/vault',
      'user-1:client-workspace-1',
      'workspace-1',
      'document-1'
    );
  });

  it('retries uploaded-document cleanup without repeating batchDelete', async () => {
    removeUploadedDocumentMock
      .mockRejectedValueOnce(new Error('disk-full'))
      .mockResolvedValueOnce(undefined);
    const engine = createEngine();

    engine.handleFileChange('unlink', '/vault/notes/hello.md');
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(500);

    expect(batchDeleteMock).toHaveBeenCalledTimes(1);
    expect(removeUploadedDocumentMock).toHaveBeenCalledTimes(2);
  });

  it('re-enters flushDelete on retry so recreated files are re-uploaded instead of deleted', async () => {
    batchDeleteMock.mockRejectedValueOnce(new Error('delete-temporary-failure'));
    getByDocumentIdMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      documentId: 'document-1',
      path: 'archive/hello.md',
      fingerprint: 'fp-1',
    });
    const engine = createEngine();

    engine.handleFileChange('unlink', '/vault/notes/hello.md');
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(500);

    expect(batchDeleteMock).toHaveBeenCalledTimes(1);
    expect(batchUpsertMock).toHaveBeenCalledTimes(1);
    expect(batchUpsertMock).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      documents: [
        expect.objectContaining({
          documentId: 'document-1',
          path: 'archive/hello.md',
          mode: 'inline_text',
          contentText,
        }),
      ],
    });
  });

  it('clears uploaded-document state before retrying cleanup delete after a permanent upload failure', async () => {
    batchUpsertMock.mockRejectedValueOnce(
      new WorkspaceContentApiError('invalid payload', 400, 'VALIDATION_ERROR')
    );
    removeUploadedDocumentMock.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
    batchDeleteMock
      .mockRejectedValueOnce(new Error('delete-temporary-failure'))
      .mockResolvedValueOnce({
        workspaceId: 'workspace-1',
        processedCount: 1,
        deletedCount: 1,
      });
    const engine = createEngine();

    engine.handleFileChange('change', '/vault/notes/hello.md');
    await vi.advanceTimersByTimeAsync(2_000);

    expect(removeUploadedDocumentMock).toHaveBeenCalledTimes(1);
    expect(batchDeleteMock).toHaveBeenCalledTimes(1);
    expect(removeUploadedDocumentMock.mock.invocationCallOrder[0]).toBeLessThan(
      batchDeleteMock.mock.invocationCallOrder[0]
    );

    await vi.advanceTimersByTimeAsync(500);

    expect(removeUploadedDocumentMock).toHaveBeenCalledTimes(2);
    expect(batchDeleteMock).toHaveBeenCalledTimes(2);
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

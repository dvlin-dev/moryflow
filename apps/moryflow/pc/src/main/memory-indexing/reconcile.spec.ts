import { describe, expect, it, vi } from 'vitest';

vi.mock(
  '@moryflow/sync',
  () => ({
    normalizeSyncPath: (value: string) => value.replace(/\\/g, '/'),
  }),
  { virtual: true }
);

const { reconcileMemoryIndexingVault } = await import('./reconcile.js');

const createProfiles = (
  vaultPath: string,
  profileKey = 'user-1:client-workspace-1',
  workspaceId = 'workspace-1'
) => ({
  resolveActiveProfile: vi.fn().mockResolvedValue({
    loggedIn: true,
    activeVault: {
      path: vaultPath,
    },
    profileKey,
    profile: {
      workspaceId,
    },
  }),
});

describe('reconcileMemoryIndexingVault', () => {
  it('marks bootstrap started before reconcile and finished after reconcile', async () => {
    const documentRegistry = {
      getAll: vi.fn().mockResolvedValue([]),
      sync: vi.fn().mockResolvedValue([]),
    };
    const memoryIndexingEngine = {
      handleFileChange: vi.fn(),
      handleReconcileChange: vi.fn(),
      getPendingPaths: vi.fn().mockReturnValue([]),
      clearPendingPathsForVault: vi.fn(),
      markBootstrapStarted: vi.fn(() => Symbol('bootstrap')),
      markBootstrapDocuments: vi.fn(),
      markBootstrapFinished: vi.fn(),
    };
    const scanWorkspaceDocuments = vi.fn().mockResolvedValue([]);

    await reconcileMemoryIndexingVault({
      vaultPath: '/vault-a',
      documentRegistry,
      memoryIndexingEngine,
      scanWorkspaceDocuments,
      profiles: createProfiles('/vault-a'),
    });

    expect(memoryIndexingEngine.markBootstrapStarted).toHaveBeenCalledWith('/vault-a');
    expect(memoryIndexingEngine.markBootstrapDocuments).toHaveBeenCalledWith(
      '/vault-a',
      memoryIndexingEngine.markBootstrapStarted.mock.results[0]?.value,
      false
    );
    expect(memoryIndexingEngine.markBootstrapFinished).toHaveBeenCalledWith(
      '/vault-a',
      memoryIndexingEngine.markBootstrapStarted.mock.results[0]?.value
    );
    expect(memoryIndexingEngine.markBootstrapStarted.mock.invocationCallOrder[0]).toBeLessThan(
      memoryIndexingEngine.markBootstrapFinished.mock.invocationCallOrder[0]
    );
  });

  it('marks bootstrap finished even when reconcile throws', async () => {
    const documentRegistry = {
      getAll: vi.fn().mockResolvedValue([]),
      sync: vi.fn(),
    };
    const memoryIndexingEngine = {
      handleFileChange: vi.fn(),
      handleReconcileChange: vi.fn(),
      getPendingPaths: vi.fn().mockReturnValue([]),
      clearPendingPathsForVault: vi.fn(),
      markBootstrapStarted: vi.fn(() => Symbol('bootstrap')),
      markBootstrapDocuments: vi.fn(),
      markBootstrapFinished: vi.fn(),
    };
    const scanWorkspaceDocuments = vi.fn().mockRejectedValue(new Error('scan failed'));

    await expect(
      reconcileMemoryIndexingVault({
        vaultPath: '/vault-a',
        documentRegistry,
        memoryIndexingEngine,
        scanWorkspaceDocuments,
        profiles: createProfiles('/vault-a'),
      })
    ).rejects.toThrow('scan failed');

    expect(memoryIndexingEngine.markBootstrapStarted).toHaveBeenCalledWith('/vault-a');
    expect(memoryIndexingEngine.markBootstrapDocuments).not.toHaveBeenCalled();
    expect(memoryIndexingEngine.markBootstrapFinished).toHaveBeenCalledWith(
      '/vault-a',
      memoryIndexingEngine.markBootstrapStarted.mock.results[0]?.value
    );
  });

  it('仅回放当前 vault 的 pending 路径，并在回放后清理对应前缀', async () => {
    const documentRegistry = {
      getAll: vi.fn().mockResolvedValue([
        {
          documentId: 'doc-1',
          path: 'notes/existing.md',
          fingerprint: 'identity-1',
          contentFingerprint: 'content-old',
        },
      ]),
      sync: vi.fn().mockResolvedValue([
        {
          documentId: 'doc-1',
          path: 'notes/existing.md',
          fingerprint: 'identity-1',
          contentFingerprint: 'content-new',
        },
        {
          documentId: 'doc-2',
          path: 'notes/new.md',
          fingerprint: 'identity-2',
          contentFingerprint: 'content-2',
        },
      ]),
    };
    const memoryIndexingEngine = {
      handleFileChange: vi.fn(),
      handleReconcileChange: vi.fn(),
      getPendingPaths: vi
        .fn()
        .mockReturnValue(['/vault-a/notes/pending.md', '/vault-b/notes/other.md']),
      clearPendingPathsForVault: vi.fn(),
      markBootstrapStarted: vi.fn(() => Symbol('bootstrap')),
      markBootstrapDocuments: vi.fn(),
      markBootstrapFinished: vi.fn(),
    };
    const scanWorkspaceDocuments = vi.fn().mockResolvedValue([
      {
        path: 'notes/existing.md',
        fingerprint: 'identity-1',
        contentFingerprint: 'content-new',
      },
      {
        path: 'notes/new.md',
        fingerprint: 'identity-2',
        contentFingerprint: 'content-2',
      },
    ]);

    await reconcileMemoryIndexingVault({
      vaultPath: '/vault-a',
      documentRegistry,
      memoryIndexingEngine,
      scanWorkspaceDocuments,
      profiles: createProfiles('/vault-a'),
    });

    expect(memoryIndexingEngine.handleReconcileChange).toHaveBeenCalledWith(
      'add',
      '/vault-a/notes/new.md'
    );
    expect(memoryIndexingEngine.handleReconcileChange).toHaveBeenCalledWith(
      'change',
      '/vault-a/notes/existing.md'
    );
    expect(memoryIndexingEngine.handleReconcileChange).toHaveBeenCalledWith(
      'change',
      '/vault-a/notes/pending.md'
    );
    expect(memoryIndexingEngine.handleReconcileChange).not.toHaveBeenCalledWith(
      'change',
      '/vault-b/notes/other.md'
    );
    expect(memoryIndexingEngine.clearPendingPathsForVault).toHaveBeenCalledWith('/vault-a/');
  });

  it('不会把所有既有文件都重放为 change，只回放真正变化的文件', async () => {
    const documentRegistry = {
      getAll: vi.fn().mockResolvedValue([
        {
          documentId: 'doc-1',
          path: 'notes/unchanged.md',
          fingerprint: 'identity-1',
          contentFingerprint: 'content-1',
        },
        {
          documentId: 'doc-2',
          path: 'notes/changed.md',
          fingerprint: 'identity-2',
          contentFingerprint: 'content-old',
        },
      ]),
      sync: vi.fn().mockResolvedValue([
        {
          documentId: 'doc-1',
          path: 'notes/unchanged.md',
          fingerprint: 'identity-1',
          contentFingerprint: 'content-1',
        },
        {
          documentId: 'doc-2',
          path: 'notes/changed.md',
          fingerprint: 'identity-2',
          contentFingerprint: 'content-new',
        },
      ]),
    };
    const memoryIndexingEngine = {
      handleFileChange: vi.fn(),
      handleReconcileChange: vi.fn(),
      getPendingPaths: vi.fn().mockReturnValue([]),
      clearPendingPathsForVault: vi.fn(),
      markBootstrapStarted: vi.fn(() => Symbol('bootstrap')),
      markBootstrapDocuments: vi.fn(),
      markBootstrapFinished: vi.fn(),
    };
    const scanWorkspaceDocuments = vi.fn().mockResolvedValue([
      {
        path: 'notes/unchanged.md',
        fingerprint: 'identity-1',
        contentFingerprint: 'content-1',
      },
      {
        path: 'notes/changed.md',
        fingerprint: 'identity-2',
        contentFingerprint: 'content-new',
      },
    ]);

    await reconcileMemoryIndexingVault({
      vaultPath: '/vault-a',
      documentRegistry,
      memoryIndexingEngine,
      scanWorkspaceDocuments,
      profiles: createProfiles('/vault-a'),
    });

    expect(memoryIndexingEngine.handleReconcileChange).toHaveBeenCalledWith(
      'change',
      '/vault-a/notes/changed.md'
    );
    expect(memoryIndexingEngine.handleReconcileChange).not.toHaveBeenCalledWith(
      'change',
      '/vault-a/notes/unchanged.md'
    );
  });

  it('在 forceReplayAll 下会把当前 vault 的所有现有文件重新入队', async () => {
    const documentRegistry = {
      getAll: vi.fn().mockResolvedValue([
        {
          documentId: 'doc-1',
          path: 'notes/unchanged.md',
          fingerprint: 'identity-1',
          contentFingerprint: 'content-1',
        },
      ]),
      sync: vi.fn().mockResolvedValue([
        {
          documentId: 'doc-1',
          path: 'notes/unchanged.md',
          fingerprint: 'identity-1',
          contentFingerprint: 'content-1',
        },
      ]),
    };
    const memoryIndexingEngine = {
      handleFileChange: vi.fn(),
      handleReconcileChange: vi.fn(),
      getPendingPaths: vi.fn().mockReturnValue([]),
      clearPendingPathsForVault: vi.fn(),
      markBootstrapStarted: vi.fn(() => Symbol('bootstrap')),
      markBootstrapDocuments: vi.fn(),
      markBootstrapFinished: vi.fn(),
    };
    const scanWorkspaceDocuments = vi.fn().mockResolvedValue([
      {
        path: 'notes/unchanged.md',
        fingerprint: 'identity-1',
        contentFingerprint: 'content-1',
      },
    ]);

    await reconcileMemoryIndexingVault({
      vaultPath: '/vault-a',
      documentRegistry,
      memoryIndexingEngine,
      scanWorkspaceDocuments,
      forceReplayAll: true,
      profiles: createProfiles('/vault-a'),
    });

    expect(memoryIndexingEngine.handleReconcileChange).toHaveBeenCalledWith(
      'change',
      '/vault-a/notes/unchanged.md'
    );
  });

  it('切换到新的 workspace profile 后，会把当前 vault 的既有文档重新入队', async () => {
    const documentRegistry = {
      getAll: vi.fn().mockResolvedValue([
        {
          documentId: 'doc-1',
          path: 'notes/unchanged.md',
          fingerprint: 'identity-1',
          contentFingerprint: 'content-1',
        },
      ]),
      sync: vi.fn().mockResolvedValue([
        {
          documentId: 'doc-1',
          path: 'notes/unchanged.md',
          fingerprint: 'identity-1',
          contentFingerprint: 'content-1',
        },
      ]),
    };
    const memoryIndexingEngine = {
      handleFileChange: vi.fn(),
      handleReconcileChange: vi.fn(),
      getPendingPaths: vi.fn().mockReturnValue([]),
      clearPendingPathsForVault: vi.fn(),
      markBootstrapStarted: vi.fn(() => Symbol('bootstrap')),
      markBootstrapDocuments: vi.fn(),
      markBootstrapFinished: vi.fn(),
    };
    const scanWorkspaceDocuments = vi.fn().mockResolvedValue([
      {
        path: 'notes/unchanged.md',
        fingerprint: 'identity-1',
        contentFingerprint: 'content-1',
      },
    ]);
    const uploadedDocuments = {
      listUploadedDocumentIds: vi.fn().mockResolvedValue(new Set<string>()),
    };
    const profiles = createProfiles('/vault-a', 'user-2:client-workspace-1', 'workspace-2');

    await reconcileMemoryIndexingVault({
      vaultPath: '/vault-a',
      documentRegistry,
      memoryIndexingEngine,
      scanWorkspaceDocuments,
      uploadedDocuments,
      profiles,
    } as any);

    expect(documentRegistry.getAll).toHaveBeenCalledWith(
      '/vault-a',
      'user-2:client-workspace-1',
      'workspace-2'
    );
    expect(documentRegistry.sync).toHaveBeenCalledWith(
      '/vault-a',
      'user-2:client-workspace-1',
      'workspace-2',
      {
        retainMissingDocumentIds: new Set<string>(),
      }
    );
    expect(uploadedDocuments.listUploadedDocumentIds).toHaveBeenCalledWith(
      '/vault-a',
      'user-2:client-workspace-1',
      'workspace-2'
    );
    expect(memoryIndexingEngine.handleReconcileChange).toHaveBeenCalledWith(
      'change',
      '/vault-a/notes/unchanged.md'
    );
  });
});

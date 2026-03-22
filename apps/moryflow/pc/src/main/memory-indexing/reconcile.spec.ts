import { describe, expect, it, vi } from 'vitest';

vi.mock(
  '@moryflow/sync',
  () => ({
    normalizeSyncPath: (value: string) => value.replace(/\\/g, '/'),
  }),
  { virtual: true }
);

const { reconcileMemoryIndexingVault } = await import('./reconcile.js');

describe('reconcileMemoryIndexingVault', () => {
  it('marks bootstrap started before reconcile and finished after reconcile', async () => {
    const documentRegistry = {
      getAll: vi.fn().mockResolvedValue([]),
      sync: vi.fn().mockResolvedValue([]),
    };
    const memoryIndexingEngine = {
      handleFileChange: vi.fn(),
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
    });

    expect(memoryIndexingEngine.handleFileChange).toHaveBeenCalledWith(
      'add',
      '/vault-a/notes/new.md'
    );
    expect(memoryIndexingEngine.handleFileChange).toHaveBeenCalledWith(
      'change',
      '/vault-a/notes/existing.md'
    );
    expect(memoryIndexingEngine.handleFileChange).toHaveBeenCalledWith(
      'change',
      '/vault-a/notes/pending.md'
    );
    expect(memoryIndexingEngine.handleFileChange).not.toHaveBeenCalledWith(
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
    });

    expect(memoryIndexingEngine.handleFileChange).toHaveBeenCalledWith(
      'change',
      '/vault-a/notes/changed.md'
    );
    expect(memoryIndexingEngine.handleFileChange).not.toHaveBeenCalledWith(
      'change',
      '/vault-a/notes/unchanged.md'
    );
  });
});

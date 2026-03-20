import { describe, expect, it, vi } from 'vitest';
import { reconcileMemoryIndexingVault } from './reconcile.js';

describe('reconcileMemoryIndexingVault', () => {
  it('仅回放当前 vault 的 pending 路径，并在回放后清理对应前缀', async () => {
    const documentRegistry = {
      getAll: vi
        .fn()
        .mockResolvedValue([
          { documentId: 'doc-1', path: 'notes/existing.md', fingerprint: 'fp-1' },
        ]),
      sync: vi.fn().mockResolvedValue([
        { documentId: 'doc-1', path: 'notes/existing.md', fingerprint: 'fp-1' },
        { documentId: 'doc-2', path: 'notes/new.md', fingerprint: 'fp-2' },
      ]),
    };
    const memoryIndexingEngine = {
      handleFileChange: vi.fn(),
      getPendingPaths: vi
        .fn()
        .mockReturnValue(['/vault-a/notes/pending.md', '/vault-b/notes/other.md']),
      clearPendingPathsForVault: vi.fn(),
    };
    const scanWorkspaceDocuments = vi.fn().mockResolvedValue([
      { path: 'notes/existing.md', fingerprint: 'fp-1' },
      { path: 'notes/new.md', fingerprint: 'fp-2' },
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
});

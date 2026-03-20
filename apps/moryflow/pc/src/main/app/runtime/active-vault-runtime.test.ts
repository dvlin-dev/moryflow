import { describe, expect, it, vi } from 'vitest';
import { ensureActiveVaultReady } from './active-vault-runtime.js';

describe('ensureActiveVaultReady', () => {
  it('在启动 watcher 和 cloud sync 后执行 memory reconcile', async () => {
    const vaultWatcherController = {
      start: vi.fn().mockResolvedValue(undefined),
    };
    const cloudSyncEngine = {
      init: vi.fn().mockResolvedValue(undefined),
    };
    const reconcileMemoryIndexing: (vaultPath: string) => Promise<void> = vi
      .fn()
      .mockResolvedValue(undefined);

    await ensureActiveVaultReady(
      {
        vaultWatcherController,
        cloudSyncEngine,
        reconcileMemoryIndexing,
      },
      '/vault-a'
    );

    expect(vaultWatcherController.start).toHaveBeenCalledWith('/vault-a');
    expect(cloudSyncEngine.init).toHaveBeenCalledWith('/vault-a');
    expect(reconcileMemoryIndexing).toHaveBeenCalledWith('/vault-a');
    expect(vaultWatcherController.start.mock.invocationCallOrder[0]).toBeLessThan(
      cloudSyncEngine.init.mock.invocationCallOrder[0]
    );
    expect(cloudSyncEngine.init.mock.invocationCallOrder[0]).toBeLessThan(
      (reconcileMemoryIndexing as any).mock.invocationCallOrder[0]
    );
  });
});

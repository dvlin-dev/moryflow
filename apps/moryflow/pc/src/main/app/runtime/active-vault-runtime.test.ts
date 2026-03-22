import { describe, expect, it, vi } from 'vitest';
import {
  ensureActiveVaultReady,
  reconcileActiveWorkspaceRuntimeAfterMembershipChange,
} from './active-vault-runtime.js';

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

  it('rebuilds the current active workspace after membership identity changes', async () => {
    const ensureActiveVaultReadyMock = vi.fn(async () => undefined);

    await reconcileActiveWorkspaceRuntimeAfterMembershipChange(
      {
        getStoredVault: vi.fn(async () => ({ path: '/vault-a' })),
        ensureActiveVaultReady: ensureActiveVaultReadyMock,
        reinitCloudSync: vi.fn(async () => undefined),
        triggerMemoryRescan: vi.fn(),
      },
      {
        identityChanged: true,
      }
    );

    expect(ensureActiveVaultReadyMock).toHaveBeenCalledWith('/vault-a');
  });

  it('keeps the minimal unchanged path by reinitializing cloud sync and rescanning memory', async () => {
    const reinitCloudSync = vi.fn(async () => undefined);
    const triggerMemoryRescan = vi.fn();

    await reconcileActiveWorkspaceRuntimeAfterMembershipChange(
      {
        getStoredVault: vi.fn(async () => ({ path: '/vault-a' })),
        ensureActiveVaultReady: vi.fn(async () => undefined),
        reinitCloudSync,
        triggerMemoryRescan,
      },
      {
        identityChanged: false,
      }
    );

    expect(reinitCloudSync).toHaveBeenCalledTimes(1);
    expect(triggerMemoryRescan).toHaveBeenCalledTimes(1);
  });
});

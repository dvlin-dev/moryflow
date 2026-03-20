/**
 * [PROVIDES]: ensureActiveVaultReady - activate runtime services for a vault
 * [DEPENDS]: vault watcher, cloud sync, memory reconcile callback
 * [POS]: Main-process active vault bootstrap orchestration
 */

export async function ensureActiveVaultReady(
  deps: {
    vaultWatcherController: {
      start: (vaultPath: string) => Promise<void>;
    };
    cloudSyncEngine: {
      init: (vaultPath: string) => Promise<void>;
    };
    reconcileMemoryIndexing: (vaultPath: string) => Promise<void>;
  },
  vaultPath: string
): Promise<void> {
  await deps.vaultWatcherController.start(vaultPath);
  await deps.cloudSyncEngine.init(vaultPath);
  await deps.reconcileMemoryIndexing(vaultPath);
}

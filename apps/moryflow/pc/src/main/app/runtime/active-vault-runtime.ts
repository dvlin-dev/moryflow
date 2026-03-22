/**
 * [PROVIDES]: ensureActiveVaultReady - activate runtime services for a vault; reconcileActiveWorkspaceRuntimeAfterMembershipChange - recover the active workspace after membership changes
 * [DEPENDS]: vault watcher, cloud sync, memory reconcile callback, stored vault lookup, membership recovery callbacks
 * [POS]: Main-process active vault bootstrap orchestration
 */

type StoredVault = {
  path?: string;
};

export async function reconcileActiveWorkspaceRuntimeAfterMembershipChange(
  deps: {
    getStoredVault: () => Promise<StoredVault | null>;
    ensureActiveVaultReady: (vaultPath: string) => Promise<void>;
    reinitCloudSync: () => Promise<void>;
    triggerMemoryRescan: () => void;
  },
  input: {
    identityChanged: boolean;
  }
): Promise<void> {
  if (!input.identityChanged) {
    await deps.reinitCloudSync();
    deps.triggerMemoryRescan();
    return;
  }

  const storedVault = await deps.getStoredVault();
  if (!storedVault?.path) {
    return;
  }

  await deps.ensureActiveVaultReady(storedVault.path);
}

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

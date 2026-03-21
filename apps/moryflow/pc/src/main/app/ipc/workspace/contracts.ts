import type { VaultTreeNode } from '../../../../shared/ipc.js';

export type RegisterWorkspaceIpcDeps = {
  ensureActiveVaultReady: (vaultPath: string) => Promise<void>;
  vaultWatcherController: {
    scheduleStart: (vaultPath: string) => void;
    updateExpandedWatchers: (paths: string[]) => Promise<void>;
  };
  cloudSyncEngine: {
    stop: () => void;
  };
  memoryIndexingEngine: {
    stop: () => void;
  };
  searchIndexService: {
    resetScope: () => void;
    query: (input: { query: string; limitPerGroup?: number }) => unknown;
    rebuild: () => unknown;
    getStatus: () => unknown;
  };
};

export type TreeCacheNodes = VaultTreeNode[];

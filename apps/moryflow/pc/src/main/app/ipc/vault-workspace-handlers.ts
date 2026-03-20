import type { IpcMainLike } from './types.js';

import type { VaultTreeNode } from '../../../shared/ipc.js';

export const registerVaultWorkspaceIpcHandlers = (input: {
  ipcMain: IpcMainLike;
  deps: {
    createVault: (...args: any[]) => unknown;
    ensureDefaultWorkspace: () => Promise<any>;
    openVault: (...args: any[]) => unknown;
    selectDirectory: () => unknown;
    getVaults: () => any[];
    getActiveVaultInfo: () => Promise<any>;
    switchVault: (vaultId: string) => Promise<any>;
    removeVault: (vaultId: string) => void;
    updateVaultName: (vaultId: string, name: string) => void;
    readVaultTreeRoot: (...args: any[]) => Promise<any>;
    readVaultTreeChildren: (...args: any[]) => Promise<any>;
    readVaultTree: (...args: any[]) => Promise<any>;
    readVaultFile: (...args: any[]) => unknown;
    writeVaultFile: (...args: any[]) => unknown;
    createVaultFile: (...args: any[]) => unknown;
    createVaultFolder: (...args: any[]) => unknown;
    renameVaultEntry: (...args: any[]) => unknown;
    moveVaultEntry: (...args: any[]) => unknown;
    deleteVaultEntry: (...args: any[]) => unknown;
    showItemInFinder: (...args: any[]) => unknown;
    getStoredVault: () => Promise<{ path?: string } | null>;
    getExpandedPaths: (vaultPath: string) => string[];
    setExpandedPaths: (...args: any[]) => void;
    getDocumentSession: (vaultPath: string) => { tabs: unknown[]; activePath: string | null };
    setDocumentSession: (...args: any[]) => void;
    getLastSidebarMode: () => 'chat' | 'home';
    setLastSidebarMode: (mode: 'chat' | 'home') => void;
    getRecentFiles: (vaultPath: string) => string[];
    recordRecentFile: (vaultPath: string, filePath: string | null) => void;
    removeRecentFile: (vaultPath: string, filePath: string | null) => void;
    getTreeCache: (vaultPath: string) => unknown;
    setTreeCache: (...args: any[]) => void;
    vaultWatcherController: {
      scheduleStart: (vaultPath: string) => void;
      updateExpandedWatchers: (paths: string[]) => Promise<void>;
    };
    cloudSyncEngine: {
      stop: () => void;
      init: (vaultPath: string) => Promise<void>;
    };
    memoryIndexingEngine: {
      stop: () => void;
    };
    searchIndexService: {
      resetScope: () => void;
    };
    existsSync: (path: string) => boolean;
    shell: {
      openPath: (path: string) => Promise<string>;
    };
    pathUtils: {
      resolve: (...paths: string[]) => string;
    };
    isToolOutputPathAllowed: (...args: any[]) => boolean;
    ensureActiveVaultReady: (vaultPath: string) => Promise<void>;
    broadcastToAllWindows: (channel: string, payload: unknown) => void;
  };
}) => {
  const { ipcMain, deps } = input;

  ipcMain.handle('vault:open', (_event, payload) => deps.openVault(payload ?? {}));
  ipcMain.handle('vault:create', (_event, payload) => deps.createVault(payload ?? {}));
  ipcMain.handle('vault:ensureDefaultWorkspace', async () => {
    const active = await deps.getActiveVaultInfo();
    if (active) {
      deps.vaultWatcherController.scheduleStart(active.path);
      await deps.cloudSyncEngine.init(active.path);
      return active;
    }

    deps.cloudSyncEngine.stop();

    const vault = await deps.ensureDefaultWorkspace();
    if (vault) {
      deps.broadcastToAllWindows('vault:vaultsChanged', deps.getVaults());
      deps.broadcastToAllWindows('vault:activeVaultChanged', vault);
      await deps.ensureActiveVaultReady(vault.path);
    }
    return vault;
  });
  ipcMain.handle('vault:selectDirectory', () => deps.selectDirectory());
  ipcMain.handle('vault:getVaults', () => deps.getVaults());
  ipcMain.handle('vault:getActiveVault', async () => {
    const vault = await deps.getActiveVaultInfo();
    if (vault) {
      await deps.ensureActiveVaultReady(vault.path);
    }
    return vault;
  });
  ipcMain.handle('vault:setActiveVault', async (_event, payload) => {
    const vaultId = typeof payload?.vaultId === 'string' ? payload.vaultId : '';
    if (!vaultId) return null;

    deps.cloudSyncEngine.stop();
    deps.memoryIndexingEngine.stop();
    deps.searchIndexService.resetScope();

    const vault = await deps.switchVault(vaultId);
    if (vault) {
      deps.broadcastToAllWindows('vault:activeVaultChanged', vault);
      await deps.ensureActiveVaultReady(vault.path);
    }
    return vault;
  });
  ipcMain.handle('vault:removeVault', (_event, payload) => {
    const vaultId = typeof payload?.vaultId === 'string' ? payload.vaultId : '';
    if (!vaultId) return;
    deps.removeVault(vaultId);
    deps.broadcastToAllWindows('vault:vaultsChanged', deps.getVaults());
  });
  ipcMain.handle('vault:renameVault', (_event, payload) => {
    const vaultId = typeof payload?.vaultId === 'string' ? payload.vaultId : '';
    const name = typeof payload?.name === 'string' ? payload.name : '';
    if (!vaultId || !name) return;
    deps.updateVaultName(vaultId, name);
    deps.broadcastToAllWindows('vault:vaultsChanged', deps.getVaults());
  });
  ipcMain.handle('vault:validateVaults', () => {
    const vaults = deps.getVaults();
    const invalidIds: string[] = [];

    for (const vault of vaults) {
      if (!deps.existsSync(vault.path)) {
        invalidIds.push(vault.id);
      }
    }

    for (const id of invalidIds) {
      deps.removeVault(id);
    }

    if (invalidIds.length > 0) {
      deps.broadcastToAllWindows('vault:vaultsChanged', deps.getVaults());
    }

    return { removedCount: invalidIds.length };
  });
  ipcMain.handle('vault:readTreeRoot', async (_event, payload) => {
    const result = await deps.readVaultTreeRoot(payload ?? {});
    if (payload?.path) {
      deps.vaultWatcherController.scheduleStart(payload.path);
    }
    return result;
  });
  ipcMain.handle('vault:readTreeChildren', async (_event, payload) =>
    deps.readVaultTreeChildren(payload ?? {})
  );
  ipcMain.handle('workspace:getExpandedPaths', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    if (!vaultPath) return [];
    return deps.getExpandedPaths(vaultPath);
  });
  ipcMain.handle('workspace:setExpandedPaths', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    const paths = Array.isArray(payload?.paths) ? payload.paths : [];
    if (!vaultPath) return;
    deps.setExpandedPaths(vaultPath, paths);
  });
  ipcMain.handle('workspace:getDocumentSession', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    if (!vaultPath) {
      return { tabs: [], activePath: null };
    }
    return deps.getDocumentSession(vaultPath);
  });
  ipcMain.handle('workspace:getLastSidebarMode', () => deps.getLastSidebarMode());
  ipcMain.handle('workspace:setLastSidebarMode', (_event, payload) => {
    const mode = typeof payload?.mode === 'string' ? payload.mode : '';
    if (mode !== 'chat' && mode !== 'home') {
      return;
    }
    deps.setLastSidebarMode(mode);
  });
  ipcMain.handle('workspace:setDocumentSession', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    if (!vaultPath) return;
    const session = payload?.session;
    const tabs = Array.isArray(session?.tabs) ? session.tabs : [];
    const activePath =
      session?.activePath === null
        ? null
        : typeof session?.activePath === 'string'
          ? session.activePath
          : null;
    deps.setDocumentSession(vaultPath, { tabs, activePath });
  });
  ipcMain.handle('workspace:getRecentFiles', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    if (!vaultPath) return [];
    return deps.getRecentFiles(vaultPath);
  });
  ipcMain.handle('workspace:recordRecentFile', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    const filePath = typeof payload?.filePath === 'string' ? payload.filePath : null;
    if (!vaultPath) return;
    deps.recordRecentFile(vaultPath, filePath);
  });
  ipcMain.handle('workspace:removeRecentFile', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    const filePath = typeof payload?.filePath === 'string' ? payload.filePath : null;
    if (!vaultPath) return;
    deps.removeRecentFile(vaultPath, filePath);
  });
  ipcMain.handle('vault:readTree', async (_event, payload) => {
    const result = await deps.readVaultTree(payload ?? {});
    if (payload?.path) {
      deps.vaultWatcherController.scheduleStart(payload.path);
    }
    return result;
  });
  ipcMain.handle('vault:getTreeCache', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    if (!vaultPath) return null;
    return deps.getTreeCache(vaultPath);
  });
  ipcMain.handle('vault:setTreeCache', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    const nodes = Array.isArray(payload?.nodes) ? (payload.nodes as VaultTreeNode[]) : [];
    if (!vaultPath || nodes.length === 0) return;
    deps.setTreeCache(vaultPath, nodes);
  });
  ipcMain.handle('vault:updateWatchPaths', async (_event, payload) => {
    const paths = Array.isArray(payload?.paths) ? payload.paths : [];
    await deps.vaultWatcherController.updateExpandedWatchers(paths);
  });
  ipcMain.handle('files:read', (_event, payload) => deps.readVaultFile(payload ?? {}));
  ipcMain.handle('files:write', (_event, payload) => deps.writeVaultFile(payload ?? {}));
  ipcMain.handle('files:createFile', (_event, payload) => deps.createVaultFile(payload ?? {}));
  ipcMain.handle('files:createFolder', (_event, payload) => deps.createVaultFolder(payload ?? {}));
  ipcMain.handle('files:rename', (_event, payload) => deps.renameVaultEntry(payload ?? {}));
  ipcMain.handle('files:move', (_event, payload) => deps.moveVaultEntry(payload ?? {}));
  ipcMain.handle('files:delete', (_event, payload) => deps.deleteVaultEntry(payload ?? {}));
  ipcMain.handle('files:showInFinder', (_event, payload) => deps.showItemInFinder(payload ?? {}));
  ipcMain.handle('files:openPath', async (_event, payload) => {
    const targetPath = typeof payload?.path === 'string' ? payload.path : '';
    if (!targetPath) {
      throw new Error('Path is required');
    }

    const vaultInfo = await deps.getStoredVault();
    const resolvedPath = deps.pathUtils.resolve(targetPath);
    const allowed = deps.isToolOutputPathAllowed({
      targetPath: resolvedPath,
      vaultRoot: vaultInfo?.path,
      pathUtils: deps.pathUtils,
    });

    if (!allowed) {
      throw new Error('Path is not allowed');
    }

    if (!deps.existsSync(resolvedPath)) {
      throw new Error('File not found');
    }

    const openError = await deps.shell.openPath(resolvedPath);
    if (openError) {
      throw new Error(openError);
    }
  });
};

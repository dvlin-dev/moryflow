import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  createVault,
  ensureDefaultWorkspace,
  getActiveVaultInfo,
  getVaults,
  openVault,
  readVaultTree,
  readVaultTreeChildren,
  readVaultTreeRoot,
  removeVault,
  selectDirectory,
  switchVault,
  updateVaultName,
} from '../../../vault/index.js';
import { type IpcMainLike, asObjectRecord, broadcastToAllWindows } from '../shared.js';
import type { RegisterWorkspaceIpcDeps } from './contracts.js';

export const registerVaultIpcHandlers = (
  ipcMain: IpcMainLike,
  deps: Pick<
    RegisterWorkspaceIpcDeps,
    | 'ensureActiveVaultReady'
    | 'vaultWatcherController'
    | 'cloudSyncEngine'
    | 'memoryIndexingEngine'
    | 'searchIndexService'
  >
): void => {
  const shouldScheduleWatcherForPath = async (targetPath: string): Promise<boolean> => {
    const activeVault = await getActiveVaultInfo();
    if (!activeVault) {
      return false;
    }
    return path.resolve(activeVault.path) === path.resolve(targetPath);
  };

  ipcMain.handle('vault:open', (_event, payload) => openVault(payload ?? {}));
  ipcMain.handle('vault:create', (_event, payload) => createVault(payload ?? {}));
  ipcMain.handle('vault:ensureDefaultWorkspace', async () => {
    const active = await getActiveVaultInfo();
    if (active) {
      await deps.ensureActiveVaultReady(active.path);
      return active;
    }

    deps.cloudSyncEngine.stop();

    const vault = await ensureDefaultWorkspace();
    if (vault) {
      broadcastToAllWindows('vault:vaultsChanged', getVaults());
      broadcastToAllWindows('vault:activeVaultChanged', vault);
      await deps.ensureActiveVaultReady(vault.path);
    }
    return vault;
  });
  ipcMain.handle('vault:selectDirectory', () => selectDirectory());
  ipcMain.handle('vault:getVaults', () => getVaults());
  ipcMain.handle('vault:getActiveVault', async () => {
    const vault = await getActiveVaultInfo();
    if (vault) {
      try {
        await deps.ensureActiveVaultReady(vault.path);
      } catch (error) {
        console.error(
          '[vault:getActiveVault] ensureActiveVaultReady failed, allowing degraded startup:',
          error
        );
      }
    }
    return vault;
  });
  ipcMain.handle('vault:setActiveVault', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const vaultId = typeof input.vaultId === 'string' ? input.vaultId : '';
    if (!vaultId) return null;

    deps.cloudSyncEngine.stop();
    deps.memoryIndexingEngine.stop();
    deps.searchIndexService.resetScope();

    const vault = await switchVault(vaultId);
    if (vault) {
      broadcastToAllWindows('vault:activeVaultChanged', vault);
      await deps.ensureActiveVaultReady(vault.path);
    }
    return vault;
  });
  ipcMain.handle('vault:removeVault', (_event, payload) => {
    const input = asObjectRecord(payload);
    const vaultId = typeof input.vaultId === 'string' ? input.vaultId : '';
    if (!vaultId) return;
    removeVault(vaultId);
    broadcastToAllWindows('vault:vaultsChanged', getVaults());
  });
  ipcMain.handle('vault:renameVault', (_event, payload) => {
    const input = asObjectRecord(payload);
    const vaultId = typeof input.vaultId === 'string' ? input.vaultId : '';
    const name = typeof input.name === 'string' ? input.name : '';
    if (!vaultId || !name) return;
    updateVaultName(vaultId, name);
    broadcastToAllWindows('vault:vaultsChanged', getVaults());
  });
  ipcMain.handle('vault:validateVaults', () => {
    const vaults = getVaults();
    const invalidIds: string[] = [];

    for (const vault of vaults) {
      if (!existsSync(vault.path)) {
        invalidIds.push(vault.id);
      }
    }

    for (const id of invalidIds) {
      removeVault(id);
    }

    if (invalidIds.length > 0) {
      broadcastToAllWindows('vault:vaultsChanged', getVaults());
    }

    return { removedCount: invalidIds.length };
  });
  ipcMain.handle('vault:readTreeRoot', async (_event, payload) => {
    const result = await readVaultTreeRoot(payload ?? {});
    const input = asObjectRecord(payload);
    if (typeof input.path === 'string' && (await shouldScheduleWatcherForPath(input.path))) {
      deps.vaultWatcherController.scheduleStart(input.path);
    }
    return result;
  });
  ipcMain.handle('vault:readTreeChildren', async (_event, payload) =>
    readVaultTreeChildren(payload ?? {})
  );
  ipcMain.handle('vault:readTree', async (_event, payload) => {
    const result = await readVaultTree(payload ?? {});
    const input = asObjectRecord(payload);
    if (typeof input.path === 'string' && (await shouldScheduleWatcherForPath(input.path))) {
      deps.vaultWatcherController.scheduleStart(input.path);
    }
    return result;
  });
  ipcMain.handle('vault:updateWatchPaths', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const paths = Array.isArray(input.paths) ? input.paths : [];
    await deps.vaultWatcherController.updateExpandedWatchers(paths);
  });
};

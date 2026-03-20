import { existsSync } from 'node:fs';
import path from 'node:path';
import { shell } from 'electron';
import {
  createVaultFile,
  createVaultFolder,
  deleteVaultEntry,
  getStoredVault,
  moveVaultEntry,
  readVaultFile,
  renameVaultEntry,
  showItemInFinder,
  writeVaultFile,
} from '../../../vault.js';
import { isToolOutputPathAllowed } from '../../../agent-runtime/tooling/tool-output-storage.js';
import { type IpcMainLike, asObjectRecord } from '../shared.js';

export const registerWorkspaceFileIpcHandlers = (ipcMain: IpcMainLike): void => {
  ipcMain.handle('files:read', (_event, payload) => readVaultFile(payload ?? {}));
  ipcMain.handle('files:write', (_event, payload) => writeVaultFile(payload ?? {}));
  ipcMain.handle('files:createFile', (_event, payload) => createVaultFile(payload ?? {}));
  ipcMain.handle('files:createFolder', (_event, payload) => createVaultFolder(payload ?? {}));
  ipcMain.handle('files:rename', (_event, payload) => renameVaultEntry(payload ?? {}));
  ipcMain.handle('files:move', (_event, payload) => moveVaultEntry(payload ?? {}));
  ipcMain.handle('files:delete', (_event, payload) => deleteVaultEntry(payload ?? {}));
  ipcMain.handle('files:showInFinder', (_event, payload) => showItemInFinder(payload ?? {}));
  ipcMain.handle('files:openPath', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const targetPath = typeof input.path === 'string' ? input.path : '';
    if (!targetPath) {
      throw new Error('Path is required');
    }

    const vaultInfo = await getStoredVault();
    const resolvedPath = path.resolve(targetPath);
    const allowed = isToolOutputPathAllowed({
      targetPath: resolvedPath,
      vaultRoot: vaultInfo?.path,
      pathUtils: path,
    });

    if (!allowed) {
      throw new Error('Path is not allowed');
    }

    if (!existsSync(resolvedPath)) {
      throw new Error('File not found');
    }

    const openError = await shell.openPath(resolvedPath);
    if (openError) {
      throw new Error(openError);
    }
  });
};

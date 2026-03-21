import { type IpcMainLike } from './shared.js';
import type { RegisterWorkspaceIpcDeps } from './workspace/contracts.js';
import { registerWorkspaceFileIpcHandlers } from './workspace/files-register.js';
import { registerWorkspaceSearchIpcHandlers } from './workspace/search-register.js';
import { registerVaultIpcHandlers } from './workspace/vault-register.js';
import { registerWorkspaceStateIpcHandlers } from './workspace/workspace-state-register.js';

export const registerWorkspaceIpcHandlers = (
  ipcMain: IpcMainLike,
  deps: RegisterWorkspaceIpcDeps
): void => {
  registerVaultIpcHandlers(ipcMain, deps);
  registerWorkspaceStateIpcHandlers(ipcMain);
  registerWorkspaceFileIpcHandlers(ipcMain);
  registerWorkspaceSearchIpcHandlers(ipcMain, deps.searchIndexService);
};

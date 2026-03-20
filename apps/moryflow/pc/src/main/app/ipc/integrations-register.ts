import { registerAgentIpcHandlers } from './agent-register.js';
import { registerCloudSyncIpcHandlers } from './cloud-sync-register.js';
import { type IpcMainLike } from './shared.js';
import { registerMembershipIpcHandlers } from './membership-register.js';
import { registerOllamaIpcHandlers } from './ollama-register.js';
import { registerTelegramIpcHandlers } from './telegram-register.js';

type RegisterIntegrationsIpcDeps = {
  ensureActiveVaultReady: (vaultPath: string) => Promise<void>;
};

export const registerIntegrationsIpcHandlers = (
  ipcMain: IpcMainLike,
  deps: RegisterIntegrationsIpcDeps
): void => {
  registerAgentIpcHandlers(ipcMain);
  registerOllamaIpcHandlers(ipcMain);
  registerMembershipIpcHandlers(ipcMain);
  registerTelegramIpcHandlers(ipcMain);
  registerCloudSyncIpcHandlers(ipcMain, deps);
};

import type { IpcMainLike } from './types.js';

type DepsRegistrar<TDeps> = (input: { ipcMain: IpcMainLike; deps: TDeps }) => void;
type MemoryRegistrar<TDeps> = (input: { ipcMain: IpcMainLike; memoryIpcDeps: TDeps }) => void;

export const registerIpcComposition = <
  TAutomationService,
  TAppShellDeps,
  TVaultWorkspaceDeps,
  TSearchDeps,
  TMemoryDeps,
  TAgentDeps,
  TOllamaDeps,
  TMembershipDeps,
  TTelegramDeps,
  TCloudSyncDeps,
>(input: {
  ipcMain: IpcMainLike;
  subscribeTelegramStatus: (listener: (status: unknown) => void) => void;
  subscribeUpdates: (listener: (state: unknown, settings: unknown) => void) => void;
  subscribeAutomationStatus: (listener: (event: unknown) => void) => void;
  broadcastToAllWindows: (channel: string, payload: unknown) => void;
  registerAutomationsIpcHandlers: (
    ipcMain: IpcMainLike,
    automationService: TAutomationService
  ) => void;
  automationService: TAutomationService;
  registerAppShellIpcHandlers: DepsRegistrar<TAppShellDeps>;
  appShellDeps: TAppShellDeps;
  registerVaultWorkspaceIpcHandlers: DepsRegistrar<TVaultWorkspaceDeps>;
  vaultWorkspaceDeps: TVaultWorkspaceDeps;
  registerSearchIpcHandlers: DepsRegistrar<TSearchDeps>;
  searchDeps: TSearchDeps;
  registerMemoryIpcHandlers: MemoryRegistrar<TMemoryDeps>;
  memoryIpcDeps: TMemoryDeps;
  registerAgentIpcHandlers: DepsRegistrar<TAgentDeps>;
  agentDeps: TAgentDeps;
  registerOllamaIpcHandlers: DepsRegistrar<TOllamaDeps>;
  ollamaDeps: TOllamaDeps;
  registerMembershipIpcHandlers: DepsRegistrar<TMembershipDeps>;
  membershipDeps: TMembershipDeps;
  registerTelegramIpcHandlers: DepsRegistrar<TTelegramDeps>;
  telegramDeps: TTelegramDeps;
  registerCloudSyncIpcHandlers: DepsRegistrar<TCloudSyncDeps>;
  cloudSyncDeps: TCloudSyncDeps;
}) => {
  input.subscribeTelegramStatus((status) => {
    input.broadcastToAllWindows('telegram:status-changed', status);
  });
  input.subscribeUpdates((state, settings) => {
    input.broadcastToAllWindows('updates:state-changed', { state, settings });
  });
  input.subscribeAutomationStatus((event) => {
    input.broadcastToAllWindows('automations:status-changed', event);
  });

  input.registerAutomationsIpcHandlers(input.ipcMain, input.automationService);
  input.registerAppShellIpcHandlers({ ipcMain: input.ipcMain, deps: input.appShellDeps });
  input.registerVaultWorkspaceIpcHandlers({
    ipcMain: input.ipcMain,
    deps: input.vaultWorkspaceDeps,
  });
  input.registerSearchIpcHandlers({ ipcMain: input.ipcMain, deps: input.searchDeps });
  input.registerMemoryIpcHandlers({ ipcMain: input.ipcMain, memoryIpcDeps: input.memoryIpcDeps });
  input.registerAgentIpcHandlers({ ipcMain: input.ipcMain, deps: input.agentDeps });
  input.registerOllamaIpcHandlers({ ipcMain: input.ipcMain, deps: input.ollamaDeps });
  input.registerMembershipIpcHandlers({ ipcMain: input.ipcMain, deps: input.membershipDeps });
  input.registerTelegramIpcHandlers({ ipcMain: input.ipcMain, deps: input.telegramDeps });
  input.registerCloudSyncIpcHandlers({ ipcMain: input.ipcMain, deps: input.cloudSyncDeps });
};

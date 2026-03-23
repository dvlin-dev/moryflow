/**
 * [INPUT]: IPC payloads from renderer/preload（含外链与工具输出文件打开请求）
 * [OUTPUT]: IPC handler results (plain JSON, serializable)
 * [POS]: Main process IPC router (validation + orchestration only)
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { app, ipcMain } from 'electron';
import type {
  AppCloseBehavior,
  AppUpdateSettings,
  AppUpdateState,
  LaunchAtLoginState,
  QuickChatWindowState,
} from '../../../shared/ipc.js';
import type { VaultWatcherController } from '../../vault-watcher/index.js';
import { cloudSyncEngine, cloudSyncApi } from '../../cloud-sync/index.js';
import { workspaceDocRegistry } from '../../workspace-doc-registry/index.js';
import { createExternalLinkPolicy, openExternalSafe } from '../security/external-links.js';
import { registerAutomationsIpcHandlers } from './automations.js';
import { createMemoryIpcDeps } from './memory-domain/deps.js';
import { registerMemoryIpcHandlers } from './memory-domain/register.js';
import { registerIntegrationsIpcHandlers } from './integrations-register.js';
import { registerRuntimeIpcHandlers } from './runtime-register.js';
import { registerWorkspaceIpcHandlers } from './workspace-register.js';
import { broadcastToAllWindows } from './shared.js';
import { memoryIndexingEngine } from '../../memory-indexing/engine.js';
import { memoryIndexingProfileState } from '../../memory-indexing/profile-state.js';
import { searchIndexService } from '../../search-index/index.js';
import { automationService } from '../../automations/service.js';
import { memoryApi } from '../../memory/index.js';
import { ensureActiveVaultReady as ensureActiveVaultRuntimeReady } from '../runtime/active-vault-runtime.js';
import { reconcileMemoryIndexingVault } from '../../memory-indexing/reconcile.js';
import { resolveActiveWorkspaceProfileContext } from '../../workspace-profile/context.js';

type RegisterIpcHandlersOptions = {
  vaultWatcherController: VaultWatcherController;
  quickChat: {
    toggle: () => Promise<void>;
    open: () => Promise<void>;
    close: () => Promise<void>;
    getState: () => Promise<QuickChatWindowState>;
    setSessionId: (sessionId: string | null) => Promise<void>;
  };
  appRuntime: {
    getCloseBehavior: () => AppCloseBehavior;
    setCloseBehavior: (behavior: AppCloseBehavior) => AppCloseBehavior;
    getLaunchAtLogin: () => LaunchAtLoginState;
    setLaunchAtLogin: (enabled: boolean) => LaunchAtLoginState;
  };
  updates: {
    getState: () => AppUpdateState;
    getSettings: () => AppUpdateSettings;
    setAutoDownload: (enabled: boolean) => AppUpdateSettings;
    checkForUpdates: (options?: { interactive?: boolean }) => Promise<AppUpdateState>;
    downloadUpdate: () => Promise<AppUpdateState>;
    restartToInstall: () => void;
    skipVersion: (version?: string | null) => AppUpdateSettings;
    subscribe: (
      listener: (state: AppUpdateState, settings: AppUpdateSettings) => void
    ) => () => void;
  };
};

const externalLinkPolicy = createExternalLinkPolicy({
  allowLocalhostHttp: true,
});

export const registerIpcHandlers = ({
  vaultWatcherController,
  quickChat,
  appRuntime,
  updates,
}: RegisterIpcHandlersOptions) => {
  const ensureActiveVaultReady = async (
    vaultPath: string,
    options?: {
      forceReplayAll?: boolean;
    }
  ): Promise<void> =>
    ensureActiveVaultRuntimeReady(
      {
        vaultWatcherController,
        cloudSyncEngine,
        reconcileMemoryIndexing: (readyVaultPath, reconcileOptions) =>
          reconcileMemoryIndexingVault({
            vaultPath: readyVaultPath,
            documentRegistry: workspaceDocRegistry,
            memoryIndexingEngine,
            forceReplayAll: reconcileOptions?.forceReplayAll,
            uploadedDocuments: memoryIndexingProfileState,
            profiles: {
              resolveActiveProfile: resolveActiveWorkspaceProfileContext,
            },
          }),
      },
      vaultPath,
      options
    );

  updates.subscribe((state, settings) => {
    broadcastToAllWindows('updates:state-changed', { state, settings });
  });
  automationService.subscribeStatusChange((event) => {
    broadcastToAllWindows('automations:status-changed', event);
  });
  registerAutomationsIpcHandlers(ipcMain, automationService);
  registerRuntimeIpcHandlers(ipcMain, {
    appVersion: () => app.getVersion(),
    quickChat,
    appRuntime,
    updates,
    openExternal: (url) => openExternalSafe(url, externalLinkPolicy),
  });
  registerWorkspaceIpcHandlers(ipcMain, {
    ensureActiveVaultReady,
    vaultWatcherController,
    cloudSyncEngine,
    memoryIndexingEngine,
    searchIndexService,
  });
  const memoryIpcDeps = createMemoryIpcDeps({
    engine: cloudSyncEngine,
    memoryIndexing: memoryIndexingEngine,
    usage: cloudSyncApi,
    documentRegistry: workspaceDocRegistry,
    api: memoryApi,
  });
  registerMemoryIpcHandlers(ipcMain, memoryIpcDeps);
  // Note: memory:readWorkspaceFile is NOT registered as IPC handler.
  // The agent runtime calls readWorkspaceFileIpc directly (not through IPC channel),
  // so no preload/desktop-api sync is needed.
  registerIntegrationsIpcHandlers(ipcMain, {
    ensureActiveVaultReady,
  });
};

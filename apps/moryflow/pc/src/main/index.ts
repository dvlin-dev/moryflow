/**
 * [INPUT]: 环境变量、Deep Link、IPC 与窗口事件
 * [OUTPUT]: Electron 主进程生命周期与窗口管理
 * [POS]: Moryflow PC 主进程入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import 'dotenv/config';
import { Notification, app, BrowserWindow, globalShortcut } from 'electron';
import path from 'node:path';
import { registerChatHandlers } from './chat/index.js';
import { subscribeMessageEvents } from './chat/services/broadcast/event-bus.js';
import { initSandboxService } from './sandbox/index.js';
import { registerSitePublishHandlers } from './site-publish/index.js';
import { createVaultWatcherController } from './vault-watcher/index.js';
import { createFsEventEmitter, type VaultFsEventType } from './app/runtime/fs-events.js';
import { createWorkspaceRuntime } from './app/bootstrap/workspace-runtime.js';
import { createDeepLinkController } from './app/bootstrap/deep-link-controller.js';
import { createMainWindowRuntime } from './app/bootstrap/main-window-runtime.js';
import { configureProtocolLifecycle } from './app/bootstrap/protocol-lifecycle.js';
import { createMembershipReconcileController } from './app/bootstrap/membership-reconcile.js';
import { createAppLifecycle, type AppLifecycleState } from './app/bootstrap/lifecycle.js';
import { createAgentSettingsBridge } from './app/runtime/agent-settings-bridge.js';
import { createMainWindow } from './app/windows/main/main-window.js';
import { createOpenMainWindowWithDeepLinkFlush } from './app/windows/main/open-main-window-flow.js';
import { hasMainWindowForDeepLink } from './app/windows/main/deep-link-window-policy.js';
import { resolvePreloadPath } from './app/preload/resolve-preload-path.js';
import { registerIpcHandlers } from './app/ipc/register-handlers.js';
import { createQuickChatWindowController } from './app/windows/quick-chat/quick-chat-window.js';
import {
  consumeHideToMenubarHint,
  getCloseBehavior,
  setCloseBehavior,
} from './app/runtime/preferences-store.js';
import {
  getQuickChatSessionId,
  getQuickChatShortcut,
  setQuickChatSessionId,
} from './app/windows/quick-chat/quick-chat-store.js';
import {
  getAutoDownloadUpdates,
  getLastUpdateCheckAt,
  getSkippedUpdateVersion,
  setAutoDownloadUpdates,
  setLastUpdateCheckAt,
  setSkippedUpdateVersion,
} from './app/updates/update-settings-store.js';
import { createMenubarController } from './app/menubar/menubar-controller.js';
import type { LaunchAtLoginState } from './app/runtime/launch-at-login.js';
import { bindMainWindowLifecyclePolicy } from './app/windows/main/window-lifecycle-policy.js';
import { createUnreadRevisionTracker } from './app/menubar/unread-revision-tracker.js';
import {
  createUnreadMenubarHandler,
  type UnreadMessageEvent,
} from './app/menubar/unread-menubar-handler.js';
import {
  getLaunchAtLoginState,
  setLaunchAtLoginEnabled,
  wasOpenedAtLogin,
} from './app/runtime/launch-at-login.js';
import { cloudSyncEngine } from './cloud-sync/index.js';
import { clearUserIdCache, fetchCurrentUserId } from './cloud-sync/user-info.js';
import {
  ensureActiveVaultReady as ensureActiveVaultRuntimeReady,
  reconcileActiveWorkspaceRuntimeAfterMembershipChange as reconcileActiveWorkspaceRuntimeAfterMembershipChangeImpl,
} from './app/runtime/active-vault-runtime.js';
import { membershipBridge } from './membership/bridge.js';
import { migrateVaultData } from './vault/migration.js';
import { setActiveVaultId, setMigrated, setVaults } from './vault/store.js';
import { initializeChatDebugLogging, shutdownChatDebugLogging } from './chat/debug/logger.js';
import { searchIndexService } from './search-index/index.js';
import { telegramChannelService } from './channels/telegram/index.js';
import { initTelegramChannelForAppStartup } from './channels/telegram/startup.js';
import { automationService } from './automations/service.js';
import { chatSessionStore } from './chat-session-store/index.js';
import {
  resolveChatSessionProfileKey,
  resolveCurrentChatSessionScope,
} from './chat-session-store/scope.js';
import { ensureDefaultWorkspace, getStoredVault } from './vault/index.js';
import { memoryIndexingEngine } from './memory-indexing/engine.js';
import { memoryIndexingProfileState } from './memory-indexing/profile-state.js';
import { reconcileMemoryIndexingVault } from './memory-indexing/reconcile.js';
import { workspaceDocRegistry } from './workspace-doc-registry/index.js';
import { resolveActiveWorkspaceProfileContext } from './workspace-profile/context.js';
import {
  extractDeepLinkFromArgv,
  getMoryflowDeepLinkScheme,
  parseOAuthCallbackDeepLink,
  redactDeepLinkForLog,
} from './membership/oauth/deep-link.js';
import { reconcileMembershipRuntimeState } from './membership/runtime.js';
import { createUpdateService } from './app/updates/update-service.js';

// Deep Link 协议名称
const PROTOCOL_NAME = getMoryflowDeepLinkScheme();

let isQuitting = false;
const unreadRevisionTracker = createUnreadRevisionTracker();

const readLaunchAtLoginState = async (): Promise<LaunchAtLoginState> => {
  return getLaunchAtLoginState();
};

const applyLaunchAtLoginState = async (enabled: boolean): Promise<LaunchAtLoginState> => {
  return setLaunchAtLoginEnabled(enabled);
};

const e2eUserData = process.env['MORYFLOW_E2E_USER_DATA'];
if (e2eUserData) {
  app.setPath('userData', path.resolve(e2eUserData));
}
const isE2EReset = process.env['MORYFLOW_E2E_RESET'] === 'true';

const showHideToMenubarHint = () => {
  if (!consumeHideToMenubarHint()) {
    return;
  }
  try {
    if (Notification.isSupported()) {
      new Notification({
        title: 'Moryflow',
        body: 'Moryflow is still running in your menu bar.',
      }).show();
    }
  } catch (error) {
    console.warn('[app] failed to show hide-to-menubar hint', error);
  }
};

let quickChatWindowController = createQuickChatWindowController({
  preloadPath: '',
  isQuitting: () => false,
  ensureSessionId: async () => null,
});

let menubarController: ReturnType<typeof createMenubarController> | null = null;
let appLifecycleState: AppLifecycleState | null = null;
const vaultWatcherController = createVaultWatcherController(emitFsEvent);
const agentSettingsBridge = createAgentSettingsBridge();
const preloadPath = resolvePreloadPath();
const workspaceRuntime = createWorkspaceRuntime({
  cloudSyncEngine,
  memoryIndexingEngine,
  searchIndexService,
  setQuickChatSessionId,
  getQuickChatWindowController: () => quickChatWindowController,
  getStoredVault,
  workspaceDocRegistry,
  resolveCurrentChatSessionScope,
  getQuickChatSessionId,
  chatSessionStore,
  ensureDefaultWorkspace,
  resolveChatSessionProfileKey,
});

const { resetWorkspaceScopedRuntimeState, ensureQuickChatSessionId } = workspaceRuntime;
const mainWindowRuntime = createMainWindowRuntime<BrowserWindow>({
  createMainWindow: ({ hooks }) =>
    createMainWindow({
      preloadPath,
      hooks,
    }),
  bindMainWindowLifecyclePolicy,
  clearUnreadCount: () => {
    menubarController?.clearUnreadCount();
  },
  getCloseBehavior,
  isQuitting: () => isQuitting,
  onHiddenToMenubar: showHideToMenubarHint,
  requestQuit: () => app.quit(),
  onAfterClosed: async () => {
    await resetWorkspaceScopedRuntimeState();
    await vaultWatcherController.stop();
  },
});
const getActiveWindow = () => mainWindowRuntime.getActiveWindow();

const deepLinkController = createDeepLinkController({
  canDeliver: () => hasMainWindowForDeepLink(mainWindowRuntime.getMainWindow()),
  focusPrimaryWindow: () => {
    void mainWindowRuntime.createOrFocusMainWindow();
  },
  deliverOAuthCallback: (payload) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('membership:oauth-callback', payload);
    }
  },
  deliverPaymentSuccess: () => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('payment:success');
    }
  },
  parseOAuthCallbackDeepLink,
  redactDeepLinkForLog,
});

const openMainWindowWithDeepLinkFlush = createOpenMainWindowWithDeepLinkFlush({
  createOrFocusMainWindow: () => mainWindowRuntime.createOrFocusMainWindow(),
  flushPendingDeepLinks: deepLinkController.flushPendingDeepLinks,
});

// 创建渲染进程事件推送
const emitToRenderer = createFsEventEmitter(getActiveWindow);

// 组合事件处理：推送到渲染进程 + 触发云同步
function emitFsEvent(type: VaultFsEventType, changedPath: string) {
  // 推送到渲染进程
  emitToRenderer(type, changedPath);

  if (type === 'file-added' || type === 'file-changed') {
    void searchIndexService.onFileAddedOrChanged(changedPath).catch((error) => {
      console.warn('[search-index] file upsert failed', changedPath, error);
    });
  } else if (type === 'file-removed') {
    void searchIndexService.onFileDeleted(changedPath).catch((error) => {
      console.warn('[search-index] file delete failed', changedPath, error);
    });
  }

  // 触发云同步引擎
  if (type === 'file-added') {
    cloudSyncEngine.handleFileChange('add', changedPath);
    memoryIndexingEngine.handleFileChange('add', changedPath);
  } else if (type === 'file-changed') {
    cloudSyncEngine.handleFileChange('change', changedPath);
    memoryIndexingEngine.handleFileChange('change', changedPath);
  } else if (type === 'file-removed') {
    cloudSyncEngine.handleFileChange('unlink', changedPath);
    memoryIndexingEngine.handleFileChange('unlink', changedPath);
  }
  // dir-added / dir-removed 不触发同步
}

const updateService = createUpdateService({
  currentVersion: app.getVersion(),
  platform: process.platform,
  isPackaged: app.isPackaged,
  getAutoDownloadEnabled: getAutoDownloadUpdates,
  setAutoDownloadEnabled: setAutoDownloadUpdates,
  getSkippedVersion: getSkippedUpdateVersion,
  setSkippedVersion: setSkippedUpdateVersion,
  getLastCheckAt: getLastUpdateCheckAt,
  setLastCheckAt: setLastUpdateCheckAt,
  forceRestart: () => {
    // Set isQuitting before quit so window close handlers won't block.
    // Don't call app.relaunch() — quitAndInstall() already schedules
    // a relaunch internally; adding another causes duplicate instances.
    isQuitting = true;
    app.quit();
    // Escalate: if the process is still alive after 3s (e.g. dangling
    // sockets/timers from telegram or runtime shutdown), hard-exit.
    // By this point quitAndInstall's install() already ran and
    // app.relaunch() was already queued, so exit triggers the relaunch.
    setTimeout(() => app.exit(0), 3000).unref();
  },
});

agentSettingsBridge.bindAgentSettingsChange();
const { gotSingleInstanceLock } = configureProtocolLifecycle({
  app,
  process,
  protocolName: PROTOCOL_NAME,
  extractDeepLinkFromArgv,
  deepLinkController,
  openMainWindowWithDeepLinkFlush,
});

const ensureActiveVaultReady = async (
  vaultPath: string,
  options?: {
    forceReplayAll?: boolean;
  }
): Promise<void> => {
  await ensureActiveVaultRuntimeReady(
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
};

const triggerMemoryRescan = () => {
  void (async () => {
    const vault = await getStoredVault();
    if (!vault?.path) return;
    await reconcileMemoryIndexingVault({
      vaultPath: vault.path,
      documentRegistry: workspaceDocRegistry,
      memoryIndexingEngine,
      uploadedDocuments: memoryIndexingProfileState,
      profiles: {
        resolveActiveProfile: resolveActiveWorkspaceProfileContext,
      },
    });
  })().catch((error) => {
    console.error('[memory-indexing] post-sync-reinit rescan failed', error);
  });
};

const reconcileActiveWorkspaceRuntimeAfterMembershipChange = async (input: {
  identityChanged: boolean;
}): Promise<void> => {
  await reconcileActiveWorkspaceRuntimeAfterMembershipChangeImpl(
    {
      getStoredVault,
      ensureActiveVaultReady,
      reinitCloudSync: async () => {
        await cloudSyncEngine.reinit();
      },
      triggerMemoryRescan,
    },
    input
  );
};

createMembershipReconcileController({
  membershipBridge,
  clearUserIdCache,
  fetchCurrentUserId,
  resetWorkspaceScopedRuntimeState,
  reconcileActiveWorkspaceRuntimeAfterMembershipChange,
  reconcileMembershipRuntimeState,
  onError: (error) => {
    console.error('[membership] reconcile failed', error);
  },
}).attach();

const registerQuickChatShortcut = (controller: typeof quickChatWindowController) => {
  if (process.platform !== 'darwin') {
    return;
  }
  const shortcut = getQuickChatShortcut();
  const registered = globalShortcut.register(shortcut, () => {
    void controller.toggle();
  });
  if (!registered) {
    console.warn('[quick-chat] failed to register global shortcut', shortcut);
  }
};

const isMainWindowVisibleAndFocused = (): boolean => {
  const mainWindow = mainWindowRuntime.getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }
  return mainWindow.isVisible() && mainWindow.isFocused();
};

const handleUnreadFromMessageEvent = createUnreadMenubarHandler({
  getQuickChatVisibleState: () => quickChatWindowController.getState(),
  isMainWindowVisibleAndFocused,
  deleteSessionRevision: (sessionId) => {
    unreadRevisionTracker.deleteSession(sessionId);
  },
  consumeUnreadRevision: (sessionId, revision) => {
    return unreadRevisionTracker.shouldIncrement(sessionId, revision);
  },
  incrementUnreadCount: () => {
    menubarController?.incrementUnreadCount();
  },
  onError: (error) => {
    console.warn('[menubar] failed to update unread badge state', error);
  },
}) satisfies (event: UnreadMessageEvent) => void;
const appLifecycle = createAppLifecycle({
  platform: process.platform,
  launchedFromLoginItem: wasOpenedAtLogin(),
  isE2EReset,
  app,
  initializeChatDebugLogging,
  shutdownChatDebugLogging,
  setVaults,
  setActiveVaultId,
  setMigrated,
  migrateVaultData,
  initSandboxService,
  registerIpcHandlers: (controller) => {
    registerIpcHandlers({
      vaultWatcherController,
      quickChat: {
        toggle: async () => {
          await controller.toggle();
        },
        open: async () => {
          await controller.open();
        },
        close: async () => {
          await controller.close();
        },
        getState: async () => {
          return controller.getState();
        },
        setSessionId: async (sessionId) => {
          if (sessionId) {
            const scope = await resolveCurrentChatSessionScope();
            if (scope && !chatSessionStore.getSummaryInScope(sessionId, scope)) {
              throw new Error('Session not found in current workspace profile.');
            }
          }
          setQuickChatSessionId(sessionId);
          controller.setSessionId(sessionId);
        },
      },
      appRuntime: {
        getCloseBehavior: () => getCloseBehavior(),
        setCloseBehavior: (behavior) => {
          setCloseBehavior(behavior);
          return getCloseBehavior();
        },
        getLaunchAtLogin: () => getLaunchAtLoginState(),
        setLaunchAtLogin: (enabled) => setLaunchAtLoginEnabled(enabled),
      },
      updates: {
        getState: () => updateService.getState(),
        getSettings: () => updateService.getSettings(),
        setAutoDownload: (enabled) => updateService.setAutoDownload(enabled),
        checkForUpdates: (options) => updateService.checkForUpdates(options),
        downloadUpdate: () => updateService.downloadUpdate(),
        restartToInstall: () => updateService.restartToInstall(),
        skipVersion: (version) => updateService.skipVersion(version),
        subscribe: (listener) => updateService.subscribe(listener),
      },
    });
  },
  registerChatHandlers,
  registerSitePublishHandlers,
  initTelegramChannelForAppStartup,
  telegramChannelService,
  automationService,
  createQuickChatWindowController: () =>
    createQuickChatWindowController({
      preloadPath,
      isQuitting: () => isQuitting,
      ensureSessionId: ensureQuickChatSessionId,
      onShow: () => {
        menubarController?.clearUnreadCount();
      },
    }),
  createMenubarController: () =>
    createMenubarController({
      onOpenMainWindow: async () => {
        await openMainWindowWithDeepLinkFlush();
      },
      onToggleQuickChat: async () => {
        await quickChatWindowController.toggle();
      },
      onQuit: () => {
        app.quit();
      },
      getLaunchAtLoginState: readLaunchAtLoginState,
      setLaunchAtLogin: applyLaunchAtLoginState,
    }),
  openMainWindowWithDeepLinkFlush,
  subscribeMessageEvents,
  handleUnreadFromMessageEvent,
  registerQuickChatShortcut,
  globalShortcut,
  unreadRevisionTracker,
  updateService,
});

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) {
    return;
  }
  appLifecycleState = await appLifecycle.start();
  quickChatWindowController =
    appLifecycleState.quickChatWindowController as typeof quickChatWindowController;
  menubarController = appLifecycleState.menubarController as typeof menubarController;

  app.on('activate', () => {
    void openMainWindowWithDeepLinkFlush();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  void resetWorkspaceScopedRuntimeState();
  appLifecycle.shutdown(
    appLifecycleState ?? {
      quickChatWindowController,
      menubarController,
      disposeMessageEventSubscription: () => undefined,
    }
  );
  menubarController = null;
});

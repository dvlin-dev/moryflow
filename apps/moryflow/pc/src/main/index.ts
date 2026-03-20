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
import { membershipBridge } from './membership-bridge.js';
import { migrateVaultData } from './vault/migration.js';
import { setActiveVaultId, setMigrated, setVaults } from './vault/store.js';
import { initializeChatDebugLogging, shutdownChatDebugLogging } from './chat-debug-log.js';
import { searchIndexService } from './search-index/index.js';
import { telegramChannelService } from './channels/telegram/index.js';
import { initTelegramChannelForAppStartup } from './channels/telegram/startup.js';
import { automationService } from './automations/service.js';
import { chatSessionStore } from './chat-session-store/index.js';
import {
  resolveChatSessionProfileKey,
  resolveCurrentChatSessionScope,
} from './chat-session-store/scope.js';
import { ensureDefaultWorkspace, getStoredVault } from './vault.js';
import { memoryIndexingEngine } from './memory-indexing/engine.js';
import { reconcileMemoryIndexingVault } from './memory-indexing/reconcile.js';
import { workspaceDocRegistry } from './workspace-doc-registry/index.js';
import {
  extractDeepLinkFromArgv,
  getMoryflowDeepLinkScheme,
  parseOAuthCallbackDeepLink,
  redactDeepLinkForLog,
} from './auth-oauth.js';
import { createUpdateService } from './app/updates/update-service.js';
import { reconcileMembershipRuntimeState } from './app/runtime/membership-runtime.js';

// Deep Link 协议名称
const PROTOCOL_NAME = getMoryflowDeepLinkScheme();

let activeWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;
let pendingMainWindowCreation: Promise<BrowserWindow> | null = null;
let disposeMainWindowLifecyclePolicy: (() => void) | null = null;
let disposeMessageEventSubscription: (() => void) | null = null;
let isQuitting = false;
const getActiveWindow = () => activeWindow;
const pendingDeepLinks: string[] = [];
const unreadRevisionTracker = createUnreadRevisionTracker();
let lastMembershipToken: string | null = membershipBridge.getConfig().token ?? null;
let lastMembershipUserId: string | null = null;
let membershipReconcileChain: Promise<void> = Promise.resolve();

const resetWorkspaceScopedRuntimeState = async (): Promise<void> => {
  cloudSyncEngine.stop();
  memoryIndexingEngine.stop();
  searchIndexService.resetScope();
  setQuickChatSessionId(null);
  quickChatWindowController.setSessionId(null);

  const storedVault = await getStoredVault();
  if (storedVault?.path) {
    workspaceDocRegistry.clearCache(storedVault.path);
  }
};

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

const ensureQuickChatSessionId = async (): Promise<string | null> => {
  const currentScope = await resolveCurrentChatSessionScope();
  const storedSessionId = getQuickChatSessionId();
  if (storedSessionId && currentScope) {
    try {
      const visibleSession = chatSessionStore.getSummaryInScope(storedSessionId, currentScope);
      if (visibleSession) {
        return visibleSession.id;
      }
      setQuickChatSessionId(null);
    } catch {
      setQuickChatSessionId(null);
    }
  }

  let vault = await getStoredVault();
  if (!vault) {
    const created = await ensureDefaultWorkspace();
    if (created?.path) {
      vault = { path: created.path };
    }
  }

  if (!vault?.path) {
    return null;
  }

  const profileKey =
    currentScope?.vaultPath === vault.path
      ? currentScope.profileKey
      : await resolveChatSessionProfileKey(vault.path);
  const session = chatSessionStore.create({
    vaultPath: vault.path,
    profileKey,
  });
  setQuickChatSessionId(session.id);
  return session.id;
};

const createOrFocusMainWindow = async (): Promise<BrowserWindow> => {
  const focusMainWindow = (window: BrowserWindow): BrowserWindow => {
    if (window.isMinimized()) {
      window.restore();
    }
    if (!window.isVisible()) {
      window.show();
    }
    window.focus();
    menubarController?.clearUnreadCount();
    return window;
  };

  if (mainWindow && !mainWindow.isDestroyed()) {
    return focusMainWindow(mainWindow);
  }

  if (!pendingMainWindowCreation) {
    pendingMainWindowCreation = createMainWindow({
      preloadPath,
      hooks: {
        onFocus: (window) => {
          mainWindow = window;
          activeWindow = window;
          menubarController?.clearUnreadCount();
        },
        onClosed: (window) => {
          if (mainWindow === window) {
            mainWindow = null;
          }
          if (activeWindow === window) {
            activeWindow = null;
          }
          disposeMainWindowLifecyclePolicy?.();
          disposeMainWindowLifecyclePolicy = null;
          void resetWorkspaceScopedRuntimeState();
          void vaultWatcherController.stop();
        },
      },
    })
      .then((created) => {
        mainWindow = created;
        disposeMainWindowLifecyclePolicy?.();
        disposeMainWindowLifecyclePolicy = bindMainWindowLifecyclePolicy(created, {
          getCloseBehavior,
          isQuitting: () => isQuitting,
          onHiddenToMenubar: showHideToMenubarHint,
          requestQuit: () => app.quit(),
        });
        return created;
      })
      .finally(() => {
        pendingMainWindowCreation = null;
      });
  }

  const created = await pendingMainWindowCreation;
  if (created.isDestroyed()) {
    return createOrFocusMainWindow();
  }
  return focusMainWindow(created);
};

let quickChatWindowController = createQuickChatWindowController({
  preloadPath: '',
  isQuitting: () => false,
  ensureSessionId: async () => null,
});

let menubarController: ReturnType<typeof createMenubarController> | null = null;
const hasMainWindowForDeepLinkDelivery = (): boolean => hasMainWindowForDeepLink(mainWindow);

/**
 * 处理 Deep Link URL
 * 支持的路径：moryflow://payment/success, moryflow://auth/success?code=...&nonce=...
 */
const handleDeepLink = (url: string) => {
  if (!hasMainWindowForDeepLinkDelivery()) {
    pendingDeepLinks.push(url);
    return;
  }

  console.log('[deep-link] received:', redactDeepLinkForLog(url));

  const focusPrimaryWindow = () => {
    void createOrFocusMainWindow();
  };

  const oauthPayload = parseOAuthCallbackDeepLink(url);
  if (oauthPayload) {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('membership:oauth-callback', oauthPayload);
    }
    focusPrimaryWindow();
    return;
  }

  try {
    const parsed = new URL(url);
    const routePath = parsed.pathname.replace(/^\/+/, ''); // 移除开头的斜杠

    // 支付成功回调
    if (parsed.host === 'payment' && routePath === 'success') {
      console.log('[deep-link] payment success callback');
      // 广播到所有窗口
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('payment:success');
      }
      // 聚焦窗口
      focusPrimaryWindow();
    }
  } catch (error) {
    console.error('[deep-link] failed to parse URL:', error);
  }
};

const flushPendingDeepLinks = () => {
  if (pendingDeepLinks.length === 0 || !hasMainWindowForDeepLinkDelivery()) {
    return;
  }
  const urls = pendingDeepLinks.splice(0, pendingDeepLinks.length);
  for (const url of urls) {
    handleDeepLink(url);
  }
};

const openMainWindowWithDeepLinkFlush = createOpenMainWindowWithDeepLinkFlush({
  createOrFocusMainWindow,
  flushPendingDeepLinks,
});

// 创建渲染进程事件推送
const emitToRenderer = createFsEventEmitter(getActiveWindow);

// 组合事件处理：推送到渲染进程 + 触发云同步
const emitFsEvent = (type: VaultFsEventType, changedPath: string) => {
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
};

const vaultWatcherController = createVaultWatcherController(emitFsEvent);
const agentSettingsBridge = createAgentSettingsBridge();
const preloadPath = resolvePreloadPath();
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

// ── Deep Link 协议注册 ──────────────────────────────────────────
// 必须在 app.whenReady() 之前注册
if (process.defaultApp) {
  // 开发环境：需要传入 electron 路径
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL_NAME, process.execPath, [process.argv[1]]);
  }
} else {
  // 生产环境
  app.setAsDefaultProtocolClient(PROTOCOL_NAME);
}

const shouldBypassSingleInstanceLock =
  process.env.MORYFLOW_E2E === 'true' && Boolean(process.env.MORYFLOW_E2E_USER_DATA?.trim());

const gotSingleInstanceLock = shouldBypassSingleInstanceLock
  ? true
  : app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

if (gotSingleInstanceLock) {
  app.on('second-instance', (_event, argv) => {
    const deepLink = extractDeepLinkFromArgv(argv);
    if (deepLink) {
      handleDeepLink(deepLink);
      return;
    }

    void openMainWindowWithDeepLinkFlush();
  });

  const initialDeepLink = extractDeepLinkFromArgv(process.argv);
  if (initialDeepLink) {
    pendingDeepLinks.push(initialDeepLink);
  }
}

// macOS: 应用运行时通过 open-url 事件接收 Deep Link
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// 监听会员状态变化：登录/登出时处理同步引擎
membershipBridge.addListener(() => {
  const config = membershipBridge.getConfig();
  const nextToken = config.token ?? null;

  membershipReconcileChain = membershipReconcileChain
    .then(async () => {
      const result = await reconcileMembershipRuntimeState(
        {
          lastToken: lastMembershipToken,
          lastUserId: lastMembershipUserId,
          nextToken,
        },
        {
          clearUserIdCache,
          fetchCurrentUserId,
          resetWorkspaceScopedRuntimeState,
          reinitCloudSync: async () => {
            await cloudSyncEngine.reinit();
          },
          triggerMemoryRescan: () => {
            void (async () => {
              const vault = await getStoredVault();
              if (!vault?.path) return;
              await reconcileMemoryIndexingVault({
                vaultPath: vault.path,
                documentRegistry: workspaceDocRegistry,
                memoryIndexingEngine,
              });
            })().catch((error) => {
              console.error('[memory-indexing] post-sync-reinit rescan failed', error);
            });
          },
        }
      );

      lastMembershipToken = result.lastToken;
      lastMembershipUserId = result.lastUserId;
    })
    .catch((error) => {
      console.error('[membership] reconcile failed', error);
    });
});

const registerQuickChatShortcut = () => {
  if (process.platform !== 'darwin') {
    return;
  }
  const shortcut = getQuickChatShortcut();
  const registered = globalShortcut.register(shortcut, () => {
    void quickChatWindowController.toggle();
  });
  if (!registered) {
    console.warn('[quick-chat] failed to register global shortcut', shortcut);
  }
};

const isMainWindowVisibleAndFocused = (): boolean => {
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

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) {
    return;
  }

  const launchedFromLoginItem = wasOpenedAtLogin();

  const chatDebugLogPath = initializeChatDebugLogging(app.getPath('logs'));
  if (chatDebugLogPath) {
    console.log('[chat-debug] log file:', chatDebugLogPath);
  } else {
    console.warn('[chat-debug] file logging disabled; fallback to console-only logging');
  }

  if (isE2EReset) {
    setVaults([]);
    setActiveVaultId(null);
    setMigrated(true);
  } else {
    // 执行 Vault 数据迁移（从单 Vault 到多 Vault）
    migrateVaultData();
  }

  // 初始化沙盒服务
  initSandboxService();

  registerIpcHandlers({
    vaultWatcherController,
    quickChat: {
      toggle: async () => {
        await quickChatWindowController.toggle();
      },
      open: async () => {
        await quickChatWindowController.open();
      },
      close: async () => {
        await quickChatWindowController.close();
      },
      getState: async () => {
        return quickChatWindowController.getState();
      },
      setSessionId: async (sessionId) => {
        if (sessionId) {
          const scope = await resolveCurrentChatSessionScope();
          if (scope && !chatSessionStore.getSummaryInScope(sessionId, scope)) {
            throw new Error('Session not found in current workspace profile.');
          }
        }
        setQuickChatSessionId(sessionId);
        quickChatWindowController.setSessionId(sessionId);
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
  registerChatHandlers();
  registerSitePublishHandlers();
  await initTelegramChannelForAppStartup(telegramChannelService);
  automationService.init();

  quickChatWindowController = createQuickChatWindowController({
    preloadPath,
    isQuitting: () => isQuitting,
    ensureSessionId: ensureQuickChatSessionId,
    onShow: () => {
      menubarController?.clearUnreadCount();
    },
  });

  if (process.platform === 'darwin') {
    menubarController = createMenubarController({
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
    });
  }

  disposeMessageEventSubscription = subscribeMessageEvents(handleUnreadFromMessageEvent);

  registerQuickChatShortcut();

  updateService.scheduleAutomaticChecks();

  if (!launchedFromLoginItem) {
    await openMainWindowWithDeepLinkFlush();
  }

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
  globalShortcut.unregisterAll();
  disposeMessageEventSubscription?.();
  disposeMessageEventSubscription = null;
  disposeMainWindowLifecyclePolicy?.();
  disposeMainWindowLifecyclePolicy = null;
  quickChatWindowController.destroy();
  menubarController?.destroy();
  menubarController = null;
  unreadRevisionTracker.clear();
  updateService.dispose();
  automationService.shutdown();
  void telegramChannelService.shutdown();
  shutdownChatDebugLogging();
});

/**
 * [INPUT]: 环境变量、Deep Link、IPC 与窗口事件
 * [OUTPUT]: Electron 主进程生命周期与窗口管理
 * [POS]: Moryflow PC 主进程入口
 * [UPDATE]: 2026-03-05 - createOrFocusMainWindow 增加建窗单飞锁，避免并发入口重复创建主窗口
 * [UPDATE]: 2026-03-05 - deep link 回放重新收口为“主窗口存在才分发”，避免 Quick Chat 独占时回调事件丢失
 * [UPDATE]: 2026-03-05 - 菜单栏未读计数改为“先判窗口可见再消费 revision”，规避异步可见性竞态清零
 * [UPDATE]: 2026-03-05 - 主窗口打开路径统一收口为“打开后 flush deep links”，覆盖登录项后台启动后托盘打开场景
 * [UPDATE]: 2026-03-05 - Quick Chat 新增会话绑定回写链路（`quick-chat:setSessionId` -> store + controller 双写）
 * [UPDATE]: 2026-03-05 - 新增 macOS 菜单栏常驻与 Quick Chat 窗口骨架（左键 toggle / 右键菜单）
 * [UPDATE]: 2026-03-04 - Telegram init 改为可选容错启动（失败不阻断主窗口）
 * [UPDATE]: 2026-03-03 - OAuth Deep Link 增加 Windows/Linux argv 回流（second-instance）与日志脱敏
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import 'dotenv/config';
import { Notification, app, BrowserWindow, globalShortcut } from 'electron';
import path from 'node:path';
import { registerChatHandlers } from './chat/index.js';
import { subscribeMessageEvents } from './chat/broadcast.js';
import { initSandboxService } from './sandbox/index.js';
import { registerSitePublishHandlers } from './site-publish/index.js';
import { createVaultWatcherController } from './vault-watcher/index.js';
import { createFsEventEmitter, type VaultFsEventType } from './app/fs-events.js';
import { createAgentSettingsBridge } from './app/agent-settings-bridge.js';
import { createMainWindow } from './app/main-window.js';
import { createOpenMainWindowWithDeepLinkFlush } from './app/open-main-window-flow.js';
import { hasMainWindowForDeepLink } from './app/deep-link-window-policy.js';
import { resolvePreloadPath } from './app/preload.js';
import { registerIpcHandlers } from './app/ipc-handlers.js';
import { createQuickChatWindowController } from './app/quick-chat-window.js';
import {
  consumeHideToMenubarHint,
  getCloseBehavior,
  setCloseBehavior,
  getQuickChatSessionId,
  getQuickChatShortcut,
  setQuickChatSessionId,
} from './app/app-runtime-settings.js';
import { createMenubarController, type LaunchAtLoginState } from './app/menubar-controller.js';
import { bindMainWindowLifecyclePolicy } from './app/window-lifecycle-policy.js';
import { createUnreadRevisionTracker } from './app/unread-revision-tracker.js';
import {
  createUnreadMenubarHandler,
  type UnreadMessageEvent,
} from './app/unread-menubar-handler.js';
import {
  getLaunchAtLoginState,
  setLaunchAtLoginEnabled,
  wasOpenedAtLogin,
} from './app/launch-at-login.js';
import { cloudSyncEngine } from './cloud-sync/index.js';
import { resetBindingConflictState } from './cloud-sync/binding-conflict.js';
import { clearUserIdCache } from './cloud-sync/user-info.js';
import { membershipBridge } from './membership-bridge.js';
import { migrateVaultData } from './vault/migration.js';
import { setActiveVaultId, setMigrated, setVaults } from './vault/store.js';
import { initializeChatDebugLogging, shutdownChatDebugLogging } from './chat-debug-log.js';
import { searchIndexService } from './search-index/index.js';
import { telegramChannelService } from './channels/telegram/index.js';
import { initTelegramChannelForAppStartup } from './channels/telegram/startup.js';
import { chatSessionStore } from './chat-session-store/index.js';
import { ensureDefaultWorkspace, getStoredVault } from './vault.js';
import {
  extractDeepLinkFromArgv,
  getMoryflowDeepLinkScheme,
  parseOAuthCallbackDeepLink,
  redactDeepLinkForLog,
} from './auth-oauth.js';

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
  const storedSessionId = getQuickChatSessionId();
  if (storedSessionId) {
    try {
      chatSessionStore.getSummary(storedSessionId);
      return storedSessionId;
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

  const session = chatSessionStore.create({
    vaultPath: vault.path,
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
  } else if (type === 'file-changed') {
    cloudSyncEngine.handleFileChange('change', changedPath);
  } else if (type === 'file-removed') {
    cloudSyncEngine.handleFileChange('unlink', changedPath);
  }
  // dir-added / dir-removed 不触发同步
};

const vaultWatcherController = createVaultWatcherController(emitFsEvent);
const agentSettingsBridge = createAgentSettingsBridge();
const preloadPath = resolvePreloadPath();

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

const gotSingleInstanceLock = app.requestSingleInstanceLock();
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
  if (nextToken !== lastMembershipToken) {
    clearUserIdCache();
    lastMembershipToken = nextToken;
  }

  if (!config.token) {
    // 登出时停止同步（内部会重置自动绑定状态）
    cloudSyncEngine.stop();
    // 清理绑定冲突状态（取消待处理的请求、清除用户 ID 缓存）
    resetBindingConflictState();
  } else {
    // 登录后重新初始化同步引擎（会触发自动绑定）
    void cloudSyncEngine.reinit();
  }
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
  });
  registerChatHandlers();
  registerSitePublishHandlers();
  await initTelegramChannelForAppStartup(telegramChannelService);

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
  globalShortcut.unregisterAll();
  disposeMessageEventSubscription?.();
  disposeMessageEventSubscription = null;
  disposeMainWindowLifecyclePolicy?.();
  disposeMainWindowLifecyclePolicy = null;
  quickChatWindowController.destroy();
  menubarController?.destroy();
  menubarController = null;
  unreadRevisionTracker.clear();
  void telegramChannelService.shutdown();
  shutdownChatDebugLogging();
});

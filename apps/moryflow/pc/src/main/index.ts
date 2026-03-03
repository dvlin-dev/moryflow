/**
 * [INPUT]: 环境变量、Deep Link、IPC 与窗口事件
 * [OUTPUT]: Electron 主进程生命周期与窗口管理
 * [POS]: Moryflow PC 主进程入口
 * [UPDATE]: 2026-03-04 - Telegram init 改为可选容错启动（失败不阻断主窗口）
 * [UPDATE]: 2026-03-03 - OAuth Deep Link 增加 Windows/Linux argv 回流（second-instance）与日志脱敏
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import 'dotenv/config';
import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { registerChatHandlers } from './chat/index.js';
import { initSandboxService } from './sandbox/index.js';
import { registerSitePublishHandlers } from './site-publish/index.js';
import { createVaultWatcherController } from './vault-watcher/index.js';
import { createFsEventEmitter, type VaultFsEventType } from './app/fs-events.js';
import { createAgentSettingsBridge } from './app/agent-settings-bridge.js';
import { createMainWindow } from './app/main-window.js';
import { resolvePreloadPath } from './app/preload.js';
import { registerIpcHandlers } from './app/ipc-handlers.js';
import { cloudSyncEngine } from './cloud-sync/index.js';
import { resetBindingConflictState } from './cloud-sync/binding-conflict.js';
import { membershipBridge } from './membership-bridge.js';
import { migrateVaultData } from './vault/migration.js';
import { setActiveVaultId, setMigrated, setVaults } from './vault/store.js';
import { initializeChatDebugLogging, shutdownChatDebugLogging } from './chat-debug-log.js';
import { searchIndexService } from './search-index/index.js';
import { telegramChannelService } from './channels/telegram/index.js';
import { initTelegramChannelForAppStartup } from './channels/telegram/startup.js';
import {
  extractDeepLinkFromArgv,
  getMoryflowDeepLinkScheme,
  parseOAuthCallbackDeepLink,
  redactDeepLinkForLog,
} from './auth-oauth.js';

// Deep Link 协议名称
const PROTOCOL_NAME = getMoryflowDeepLinkScheme();

let activeWindow: BrowserWindow | null = null;
const getActiveWindow = () => activeWindow;
const pendingDeepLinks: string[] = [];

const e2eUserData = process.env['MORYFLOW_E2E_USER_DATA'];
if (e2eUserData) {
  app.setPath('userData', path.resolve(e2eUserData));
}
const isE2EReset = process.env['MORYFLOW_E2E_RESET'] === 'true';

/**
 * 处理 Deep Link URL
 * 支持的路径：moryflow://payment/success, moryflow://auth/success?code=...&nonce=...
 */
const handleDeepLink = (url: string) => {
  if (BrowserWindow.getAllWindows().length === 0) {
    pendingDeepLinks.push(url);
    return;
  }

  console.log('[deep-link] received:', redactDeepLinkForLog(url));

  const focusPrimaryWindow = () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
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
    const path = parsed.pathname.replace(/^\/+/, ''); // 移除开头的斜杠

    // 支付成功回调
    if (parsed.host === 'payment' && path === 'success') {
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
  if (pendingDeepLinks.length === 0 || BrowserWindow.getAllWindows().length === 0) {
    return;
  }
  const urls = pendingDeepLinks.splice(0, pendingDeepLinks.length);
  for (const url of urls) {
    handleDeepLink(url);
  }
};

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

const handleWindowFocus = (window: BrowserWindow) => {
  activeWindow = window;
};

const handleWindowClosed = (window: BrowserWindow) => {
  if (activeWindow === window) {
    activeWindow = null;
  }
  void vaultWatcherController.stop();
};

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

    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
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

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) {
    return;
  }

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

  registerIpcHandlers({ vaultWatcherController });
  registerChatHandlers();
  registerSitePublishHandlers();
  await initTelegramChannelForAppStartup(telegramChannelService);
  await createMainWindow({
    preloadPath,
    hooks: {
      onFocus: handleWindowFocus,
      onClosed: handleWindowClosed,
    },
  });
  flushPendingDeepLinks();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow({
        preloadPath,
        hooks: {
          onFocus: handleWindowFocus,
          onClosed: handleWindowClosed,
        },
      }).then(() => {
        flushPendingDeepLinks();
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  void telegramChannelService.shutdown();
  shutdownChatDebugLogging();
});

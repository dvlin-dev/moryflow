/**
 * [INPUT]: 环境变量、Deep Link、IPC 与窗口事件
 * [OUTPUT]: Electron 主进程生命周期与窗口管理
 * [POS]: Moryflow PC 主进程入口
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
import { initializeThinkingDebugLogging } from './thinking-debug.js';

// Deep Link 协议名称
const PROTOCOL_NAME = 'moryflow';

let activeWindow: BrowserWindow | null = null;
const getActiveWindow = () => activeWindow;

const e2eUserData = process.env['MORYFLOW_E2E_USER_DATA'];
if (e2eUserData) {
  app.setPath('userData', path.resolve(e2eUserData));
}
const isE2EReset = process.env['MORYFLOW_E2E_RESET'] === 'true';

/**
 * 处理 Deep Link URL
 * 支持的路径：moryflow://payment/success
 */
const handleDeepLink = (url: string) => {
  console.log('[deep-link] received:', url);

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
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    }
  } catch (error) {
    console.error('[deep-link] failed to parse URL:', error);
  }
};

// 创建渲染进程事件推送
const emitToRenderer = createFsEventEmitter(getActiveWindow);

// 组合事件处理：推送到渲染进程 + 触发云同步
const emitFsEvent = (type: VaultFsEventType, changedPath: string) => {
  // 推送到渲染进程
  emitToRenderer(type, changedPath);

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
  const thinkingDebugLogPath = initializeThinkingDebugLogging(app.getPath('logs'));
  if (thinkingDebugLogPath) {
    console.log('[thinking-debug] log file:', thinkingDebugLogPath);
  } else {
    console.warn('[thinking-debug] file logging disabled; fallback to console-only logging');
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
  await createMainWindow({
    preloadPath,
    hooks: {
      onFocus: handleWindowFocus,
      onClosed: handleWindowClosed,
    },
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow({
        preloadPath,
        hooks: {
          onFocus: handleWindowFocus,
          onClosed: handleWindowClosed,
        },
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

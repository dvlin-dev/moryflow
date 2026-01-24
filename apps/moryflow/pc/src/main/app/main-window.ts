/**
 * [INPUT]: preloadPath, Electron app state
 * [OUTPUT]: BrowserWindow 实例 + 安全导航策略 + E2E devtools guard（类型安全）
 * [POS]: 主窗口创建与导航安全边界
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import {
  createExternalLinkPolicy,
  isAllowedNavigationUrl,
  openExternalSafe,
} from './external-links.js';

export type MainWindowHooks = {
  onFocus?: (window: BrowserWindow) => void;
  onClosed?: (window: BrowserWindow) => void;
};

export type CreateMainWindowOptions = {
  preloadPath: string;
  hooks?: MainWindowHooks;
};

/**
 * 创建应用主窗口，统一处理基础配置与生命周期事件。
 */
export const createMainWindow = async ({ preloadPath, hooks }: CreateMainWindowOptions) => {
  console.log('[electron] preload entry', preloadPath);
  const pageUrl = process.env['ELECTRON_RENDERER_URL'];
  const rendererOrigin = pageUrl ? new URL(pageUrl).origin : null;
  const rendererRoot = path.join(__dirname, '../renderer');
  const isE2E = process.env['MORYFLOW_E2E'] === 'true';
  const externalLinkPolicy = createExternalLinkPolicy({
    rendererOrigin,
    rendererRoot,
    allowLocalhostHttp: !app.isPackaged,
    hostAllowlist: process.env['MORYFLOW_EXTERNAL_HOST_ALLOWLIST'],
  });

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
    },
  });

  if (app.isPackaged) {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  } else if (pageUrl) {
    await mainWindow.loadURL(pageUrl);
    if (!isE2E) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void openExternalSafe(url, externalLinkPolicy);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigationUrl(url, externalLinkPolicy)) {
      event.preventDefault();
      void openExternalSafe(url, externalLinkPolicy);
    }
  });

  mainWindow.webContents.on('will-redirect', (event, url) => {
    if (!isAllowedNavigationUrl(url, externalLinkPolicy)) {
      event.preventDefault();
      void openExternalSafe(url, externalLinkPolicy);
    }
  });

  mainWindow.on('focus', () => {
    hooks?.onFocus?.(mainWindow);
  });

  mainWindow.on('closed', () => {
    hooks?.onClosed?.(mainWindow);
  });

  hooks?.onFocus?.(mainWindow);

  return mainWindow;
};

/**
 * [INPUT]: preloadPath, Electron app state
 * [OUTPUT]: BrowserWindow 实例 + 安全导航策略 + E2E devtools guard（类型安全）
 * [POS]: 主窗口创建与导航安全边界
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { app, BrowserWindow } from 'electron';
import { createExternalLinkPolicy } from '../../security/external-links.js';
import { bindExternalNavigationGuards } from '../shared/external-navigation-guards.js';
import { resolveRendererIndexPath, resolveRendererRoot } from '../shared/renderer-paths.js';

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
  const rendererRoot = resolveRendererRoot();
  const isE2E = process.env['MORYFLOW_E2E'] === 'true';
  const externalLinkPolicy = createExternalLinkPolicy({
    rendererOrigin,
    rendererRoot,
    allowLocalhostHttp: true,
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
    await mainWindow.loadFile(resolveRendererIndexPath());
  } else if (pageUrl) {
    await mainWindow.loadURL(pageUrl);
    if (!isE2E) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  }

  bindExternalNavigationGuards(mainWindow.webContents, externalLinkPolicy);

  mainWindow.on('focus', () => {
    hooks?.onFocus?.(mainWindow);
  });

  mainWindow.on('closed', () => {
    hooks?.onClosed?.(mainWindow);
  });

  hooks?.onFocus?.(mainWindow);

  return mainWindow;
};

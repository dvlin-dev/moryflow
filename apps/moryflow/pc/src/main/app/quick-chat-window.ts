/**
 * [INPUT]: preloadPath、quick chat sessionId 解析器、应用退出状态
 * [OUTPUT]: Quick Chat 窗口控制器（open/close/toggle/getState）
 * [POS]: 菜单栏 Quick Chat 独立窗口管理
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { BrowserWindow, screen } from 'electron';
import path from 'node:path';
import {
  createExternalLinkPolicy,
  isAllowedNavigationUrl,
  openExternalSafe,
} from './external-links.js';

export type QuickChatWindowState = {
  visible: boolean;
  focused: boolean;
  sessionId: string | null;
};

export type QuickChatWindowController = {
  open: () => Promise<void>;
  close: () => Promise<void>;
  toggle: () => Promise<void>;
  getState: () => Promise<QuickChatWindowState>;
  setSessionId: (sessionId: string | null) => void;
  destroy: () => void;
};

export type CreateQuickChatWindowControllerOptions = {
  preloadPath: string;
  isQuitting: () => boolean;
  ensureSessionId: () => Promise<string | null>;
  onShow?: () => void;
  onHide?: () => void;
};

const QUICK_CHAT_QUERY_KEY = 'appMode';
const QUICK_CHAT_QUERY_VALUE = 'quick-chat';

const centerWindowOnActiveDisplay = (window: BrowserWindow): void => {
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const workArea = display.workArea;
  const [width, height] = window.getSize();
  const x = Math.round(workArea.x + (workArea.width - width) / 2);
  const y = Math.round(workArea.y + (workArea.height - height) / 2);
  window.setPosition(x, y, false);
};

const loadQuickChatRenderer = async (window: BrowserWindow): Promise<void> => {
  const pageUrl = process.env['ELECTRON_RENDERER_URL'];
  if (appIsPackaged()) {
    await window.loadFile(path.join(__dirname, '../renderer/index.html'), {
      query: { [QUICK_CHAT_QUERY_KEY]: QUICK_CHAT_QUERY_VALUE },
    });
    return;
  }

  if (!pageUrl) {
    throw new Error('Renderer URL is not available.');
  }

  const url = new URL(pageUrl);
  url.searchParams.set(QUICK_CHAT_QUERY_KEY, QUICK_CHAT_QUERY_VALUE);
  await window.loadURL(url.toString());
};

const appIsPackaged = (): boolean => {
  return process.env['ELECTRON_RENDERER_URL'] ? false : true;
};

export const createQuickChatWindowController = ({
  preloadPath,
  isQuitting,
  ensureSessionId,
  onShow,
  onHide,
}: CreateQuickChatWindowControllerOptions): QuickChatWindowController => {
  let quickChatWindow: BrowserWindow | null = null;
  let pendingWindowCreation: Promise<BrowserWindow> | null = null;
  let pendingSessionResolution: Promise<string | null> | null = null;
  let windowVisibilityIntent: 'open' | 'close' = 'close';
  let sessionId: string | null = null;

  const externalLinkPolicy = createExternalLinkPolicy({
    allowLocalhostHttp: true,
  });

  const resolveSessionId = async (): Promise<string | null> => {
    if (!pendingSessionResolution) {
      pendingSessionResolution = ensureSessionId()
        .then((resolvedSessionId) => {
          sessionId = resolvedSessionId;
          return resolvedSessionId;
        })
        .finally(() => {
          pendingSessionResolution = null;
        });
    }
    return pendingSessionResolution;
  };

  const createWindow = async (): Promise<BrowserWindow> => {
    const window = new BrowserWindow({
      width: 760,
      height: 560,
      minWidth: 560,
      minHeight: 420,
      show: false,
      titleBarStyle: 'hiddenInset',
      fullscreenable: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        webSecurity: true,
        spellcheck: false,
      },
    });

    window.webContents.setWindowOpenHandler(({ url }) => {
      void openExternalSafe(url, externalLinkPolicy);
      return { action: 'deny' };
    });

    window.webContents.on('will-navigate', (event, url) => {
      if (!isAllowedNavigationUrl(url, externalLinkPolicy)) {
        event.preventDefault();
        void openExternalSafe(url, externalLinkPolicy);
      }
    });

    window.webContents.on('will-redirect', (event, url) => {
      if (!isAllowedNavigationUrl(url, externalLinkPolicy)) {
        event.preventDefault();
        void openExternalSafe(url, externalLinkPolicy);
      }
    });

    window.on('show', () => {
      onShow?.();
    });

    window.on('hide', () => {
      onHide?.();
    });

    window.on('close', (event) => {
      if (isQuitting()) {
        return;
      }
      event.preventDefault();
      window.hide();
    });

    window.on('closed', () => {
      quickChatWindow = null;
    });

    await loadQuickChatRenderer(window);
    return window;
  };

  const ensureWindow = async (): Promise<BrowserWindow> => {
    if (quickChatWindow && !quickChatWindow.isDestroyed()) {
      return quickChatWindow;
    }
    if (!pendingWindowCreation) {
      pendingWindowCreation = createWindow()
        .then((window) => {
          quickChatWindow = window;
          return window;
        })
        .finally(() => {
          pendingWindowCreation = null;
        });
    }
    return pendingWindowCreation;
  };

  const showWindow = (window: BrowserWindow): void => {
    windowVisibilityIntent = 'open';
    centerWindowOnActiveDisplay(window);
    if (!window.isVisible()) {
      window.show();
    }
    window.focus();
  };

  const open = async (): Promise<void> => {
    windowVisibilityIntent = 'open';
    await resolveSessionId();
    const window = await ensureWindow();
    if (windowVisibilityIntent !== 'open') {
      return;
    }
    showWindow(window);
  };

  const close = async (): Promise<void> => {
    windowVisibilityIntent = 'close';
    if (pendingWindowCreation) {
      try {
        await pendingWindowCreation;
      } catch {
        return;
      }
    }

    if (!quickChatWindow || quickChatWindow.isDestroyed()) {
      return;
    }
    if (quickChatWindow.isVisible()) {
      quickChatWindow.hide();
    }
  };

  const toggle = async (): Promise<void> => {
    const existingWindow =
      quickChatWindow && !quickChatWindow.isDestroyed() ? quickChatWindow : null;
    if (existingWindow?.isVisible()) {
      if (existingWindow.isFocused()) {
        windowVisibilityIntent = 'close';
        existingWindow.hide();
        return;
      }
      showWindow(existingWindow);
      return;
    }

    windowVisibilityIntent = 'open';
    await resolveSessionId();
    const window = await ensureWindow();
    if (windowVisibilityIntent !== 'open') {
      return;
    }

    if (window.isVisible() && window.isFocused()) {
      windowVisibilityIntent = 'close';
      window.hide();
      return;
    }
    showWindow(window);
  };

  const getState = async (): Promise<QuickChatWindowState> => {
    if (!quickChatWindow || quickChatWindow.isDestroyed()) {
      return {
        visible: false,
        focused: false,
        sessionId,
      };
    }
    return {
      visible: quickChatWindow.isVisible(),
      focused: quickChatWindow.isFocused(),
      sessionId,
    };
  };

  const setSessionId = (nextSessionId: string | null): void => {
    const normalized = typeof nextSessionId === 'string' ? nextSessionId.trim() : '';
    sessionId = normalized.length > 0 ? normalized : null;
  };

  const destroy = (): void => {
    if (!quickChatWindow || quickChatWindow.isDestroyed()) {
      quickChatWindow = null;
      return;
    }
    quickChatWindow.destroy();
    quickChatWindow = null;
  };

  return {
    open,
    close,
    toggle,
    getState,
    setSessionId,
    destroy,
  };
};

/**
 * [INPUT]: 运行时行为设置（close behavior / quick chat shortcut / quick chat session / app update）
 * [OUTPUT]: 主进程可复用的 app runtime 设置读写方法（electron-store）
 * [POS]: 菜单栏常驻、Quick Chat 与应用更新的配置事实源
 */

import Store from 'electron-store';

export type CloseBehavior = 'hide_to_menubar' | 'quit';

type AppRuntimeStoreShape = {
  closeBehavior: CloseBehavior;
  quickChatShortcut: string;
  quickChatSessionId: string | null;
  hasShownHideToMenubarHint: boolean;
  autoDownloadUpdates: boolean;
  skippedUpdateVersion: string | null;
  lastUpdateCheckAt: string | null;
};

export const DEFAULT_CLOSE_BEHAVIOR: CloseBehavior = 'hide_to_menubar';
export const DEFAULT_QUICK_CHAT_SHORTCUT = 'CommandOrControl+Shift+M';

const appRuntimeStore = new Store<AppRuntimeStoreShape>({
  name: 'app-runtime',
  defaults: {
    closeBehavior: DEFAULT_CLOSE_BEHAVIOR,
    quickChatShortcut: DEFAULT_QUICK_CHAT_SHORTCUT,
    quickChatSessionId: null,
    hasShownHideToMenubarHint: false,
    autoDownloadUpdates: true,
    skippedUpdateVersion: null,
    lastUpdateCheckAt: null,
  },
});

const isCloseBehavior = (value: unknown): value is CloseBehavior =>
  value === 'hide_to_menubar' || value === 'quit';

const normalizeStoredString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const getCloseBehavior = (): CloseBehavior => {
  const stored = appRuntimeStore.get('closeBehavior');
  return isCloseBehavior(stored) ? stored : DEFAULT_CLOSE_BEHAVIOR;
};

export const setCloseBehavior = (value: CloseBehavior): void => {
  appRuntimeStore.set('closeBehavior', value);
};

export const getAutoDownloadUpdates = (): boolean => {
  return appRuntimeStore.get('autoDownloadUpdates') !== false;
};

export const setAutoDownloadUpdates = (enabled: boolean): void => {
  appRuntimeStore.set('autoDownloadUpdates', enabled);
};

export const getSkippedUpdateVersion = (): string | null => {
  return normalizeStoredString(appRuntimeStore.get('skippedUpdateVersion'));
};

export const setSkippedUpdateVersion = (version: string | null): void => {
  appRuntimeStore.set('skippedUpdateVersion', normalizeStoredString(version));
};

export const getLastUpdateCheckAt = (): string | null => {
  return normalizeStoredString(appRuntimeStore.get('lastUpdateCheckAt'));
};

export const setLastUpdateCheckAt = (value: string | null): void => {
  appRuntimeStore.set('lastUpdateCheckAt', normalizeStoredString(value));
};

export const getQuickChatShortcut = (): string => {
  const stored = appRuntimeStore.get('quickChatShortcut');
  if (typeof stored !== 'string') {
    return DEFAULT_QUICK_CHAT_SHORTCUT;
  }
  const normalized = stored.trim();
  return normalized.length > 0 ? normalized : DEFAULT_QUICK_CHAT_SHORTCUT;
};

export const getQuickChatSessionId = (): string | null => {
  return normalizeStoredString(appRuntimeStore.get('quickChatSessionId'));
};

export const setQuickChatSessionId = (sessionId: string | null): void => {
  appRuntimeStore.set('quickChatSessionId', normalizeStoredString(sessionId));
};

export const consumeHideToMenubarHint = (): boolean => {
  const hasShown = appRuntimeStore.get('hasShownHideToMenubarHint') === true;
  if (hasShown) {
    return false;
  }
  appRuntimeStore.set('hasShownHideToMenubarHint', true);
  return true;
};

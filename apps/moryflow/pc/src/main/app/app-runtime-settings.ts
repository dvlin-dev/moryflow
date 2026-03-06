/**
 * [INPUT]: 运行时行为设置（close behavior / quick chat shortcut / quick chat session）
 * [OUTPUT]: 主进程可复用的 app runtime 设置读写方法（electron-store）
 * [POS]: 菜单栏常驻与 Quick Chat 的配置事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import Store from 'electron-store';

export type CloseBehavior = 'hide_to_menubar' | 'quit';

type AppRuntimeStoreShape = {
  closeBehavior: CloseBehavior;
  quickChatShortcut: string;
  quickChatSessionId: string | null;
  hasShownHideToMenubarHint: boolean;
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
  },
});

const isCloseBehavior = (value: unknown): value is CloseBehavior =>
  value === 'hide_to_menubar' || value === 'quit';

export const getCloseBehavior = (): CloseBehavior => {
  const stored = appRuntimeStore.get('closeBehavior');
  return isCloseBehavior(stored) ? stored : DEFAULT_CLOSE_BEHAVIOR;
};

export const setCloseBehavior = (value: CloseBehavior): void => {
  appRuntimeStore.set('closeBehavior', value);
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
  const stored = appRuntimeStore.get('quickChatSessionId');
  if (typeof stored !== 'string') {
    return null;
  }
  const normalized = stored.trim();
  return normalized.length > 0 ? normalized : null;
};

export const setQuickChatSessionId = (sessionId: string | null): void => {
  const normalized = typeof sessionId === 'string' ? sessionId.trim() : '';
  appRuntimeStore.set('quickChatSessionId', normalized.length > 0 ? normalized : null);
};

export const consumeHideToMenubarHint = (): boolean => {
  const hasShown = appRuntimeStore.get('hasShownHideToMenubarHint') === true;
  if (hasShown) {
    return false;
  }
  appRuntimeStore.set('hasShownHideToMenubarHint', true);
  return true;
};

/**
 * [INPUT]: quick chat 快捷键与 session 持久化
 * [OUTPUT]: quick chat 相关设置读写方法（electron-store）
 * [POS]: quick chat 设置事实源
 */

import {
  appRuntimeStore,
  DEFAULT_QUICK_CHAT_SHORTCUT,
  normalizeStoredString,
} from '../../runtime/app-runtime-store.js';

export { DEFAULT_QUICK_CHAT_SHORTCUT } from '../../runtime/app-runtime-store.js';

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

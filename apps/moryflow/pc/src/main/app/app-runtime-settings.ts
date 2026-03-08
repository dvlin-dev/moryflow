/**
 * [INPUT]: 运行时行为设置（close behavior / quick chat shortcut / quick chat session）
 * [OUTPUT]: 主进程可复用的 app runtime 设置读写方法（electron-store）
 * [POS]: 菜单栏常驻与 Quick Chat 的配置事实源
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import Store from 'electron-store';
import type { UpdateChannel } from '../../shared/ipc/app-update.js';

export type CloseBehavior = 'hide_to_menubar' | 'quit';
type SkippedUpdateVersions = Record<UpdateChannel, string | null>;

type AppRuntimeStoreShape = {
  closeBehavior: CloseBehavior;
  quickChatShortcut: string;
  quickChatSessionId: string | null;
  hasShownHideToMenubarHint: boolean;
  updateChannel: UpdateChannel;
  autoCheckForUpdates: boolean;
  autoDownloadUpdates: boolean;
  skippedUpdateVersions: SkippedUpdateVersions;
  lastUpdateCheckAt: string | null;
};

export const DEFAULT_CLOSE_BEHAVIOR: CloseBehavior = 'hide_to_menubar';
export const DEFAULT_QUICK_CHAT_SHORTCUT = 'CommandOrControl+Shift+M';
export const DEFAULT_UPDATE_CHANNEL: UpdateChannel = 'stable';
const DEFAULT_SKIPPED_UPDATE_VERSIONS: SkippedUpdateVersions = {
  stable: null,
  beta: null,
};

const appRuntimeStore = new Store<AppRuntimeStoreShape>({
  name: 'app-runtime',
  defaults: {
    closeBehavior: DEFAULT_CLOSE_BEHAVIOR,
    quickChatShortcut: DEFAULT_QUICK_CHAT_SHORTCUT,
    quickChatSessionId: null,
    hasShownHideToMenubarHint: false,
    updateChannel: DEFAULT_UPDATE_CHANNEL,
    autoCheckForUpdates: true,
    autoDownloadUpdates: false,
    skippedUpdateVersions: DEFAULT_SKIPPED_UPDATE_VERSIONS,
    lastUpdateCheckAt: null,
  },
});

const isCloseBehavior = (value: unknown): value is CloseBehavior =>
  value === 'hide_to_menubar' || value === 'quit';

const isUpdateChannel = (value: unknown): value is UpdateChannel =>
  value === 'stable' || value === 'beta';

const normalizeStoredString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeSkippedUpdateVersions = (value: unknown): SkippedUpdateVersions => {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_SKIPPED_UPDATE_VERSIONS };
  }

  return {
    stable: normalizeStoredString((value as Partial<SkippedUpdateVersions>).stable),
    beta: normalizeStoredString((value as Partial<SkippedUpdateVersions>).beta),
  };
};

const getLegacySkippedUpdateVersion = (): string | null => {
  return normalizeStoredString(appRuntimeStore.get('skippedUpdateVersion' as never));
};

export const getCloseBehavior = (): CloseBehavior => {
  const stored = appRuntimeStore.get('closeBehavior');
  return isCloseBehavior(stored) ? stored : DEFAULT_CLOSE_BEHAVIOR;
};

export const setCloseBehavior = (value: CloseBehavior): void => {
  appRuntimeStore.set('closeBehavior', value);
};

export const getUpdateChannel = (): UpdateChannel => {
  const stored = appRuntimeStore.get('updateChannel');
  return isUpdateChannel(stored) ? stored : DEFAULT_UPDATE_CHANNEL;
};

export const setUpdateChannel = (channel: UpdateChannel): void => {
  appRuntimeStore.set('updateChannel', channel);
};

export const getAutoCheckForUpdates = (): boolean => {
  return appRuntimeStore.get('autoCheckForUpdates') !== false;
};

export const setAutoCheckForUpdates = (enabled: boolean): void => {
  appRuntimeStore.set('autoCheckForUpdates', enabled);
};

export const getAutoDownloadUpdates = (): boolean => {
  return appRuntimeStore.get('autoDownloadUpdates') === true;
};

export const setAutoDownloadUpdates = (enabled: boolean): void => {
  appRuntimeStore.set('autoDownloadUpdates', enabled);
};

export const getSkippedUpdateVersion = (channel: UpdateChannel): string | null => {
  const stored = normalizeSkippedUpdateVersions(appRuntimeStore.get('skippedUpdateVersions'));
  if (stored[channel]) {
    return stored[channel];
  }
  if (channel === 'stable') {
    return getLegacySkippedUpdateVersion();
  }
  return null;
};

export const setSkippedUpdateVersion = (channel: UpdateChannel, version: string | null): void => {
  const stored = normalizeSkippedUpdateVersions(appRuntimeStore.get('skippedUpdateVersions'));
  appRuntimeStore.set('skippedUpdateVersions', {
    ...stored,
    [channel]: normalizeStoredString(version),
  });
  appRuntimeStore.delete('skippedUpdateVersion' as never);
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

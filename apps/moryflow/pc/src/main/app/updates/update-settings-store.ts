/**
 * [INPUT]: 应用更新配置（auto download / skipped version / last check）
 * [OUTPUT]: 更新设置读写方法（electron-store）
 * [POS]: 应用更新设置事实源
 */

import { appRuntimeStore, normalizeStoredString } from '../runtime/app-runtime-store.js';

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

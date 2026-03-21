/**
 * [INPUT]: 窗口级偏好设置（close behavior / hide hint）
 * [OUTPUT]: 主进程偏好读写方法（electron-store）
 * [POS]: app runtime 偏好设置事实源
 */

import {
  appRuntimeStore,
  DEFAULT_CLOSE_BEHAVIOR,
  type CloseBehavior,
} from './app-runtime-store.js';

const isCloseBehavior = (value: unknown): value is CloseBehavior =>
  value === 'hide_to_menubar' || value === 'quit';

export type { CloseBehavior } from './app-runtime-store.js';

export const getCloseBehavior = (): CloseBehavior => {
  const stored = appRuntimeStore.get('closeBehavior');
  return isCloseBehavior(stored) ? stored : DEFAULT_CLOSE_BEHAVIOR;
};

export const setCloseBehavior = (value: CloseBehavior): void => {
  appRuntimeStore.set('closeBehavior', value);
};

export const consumeHideToMenubarHint = (): boolean => {
  const hasShown = appRuntimeStore.get('hasShownHideToMenubarHint') === true;
  if (hasShown) {
    return false;
  }
  appRuntimeStore.set('hasShownHideToMenubarHint', true);
  return true;
};

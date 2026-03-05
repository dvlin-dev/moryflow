/**
 * [INPUT]: main window close 事件、closeBehavior、应用退出状态
 * [OUTPUT]: 主窗口 close 行为策略（hide_to_menubar / quit）
 * [POS]: 主窗口生命周期策略收口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { BrowserWindow } from 'electron';
import type { CloseBehavior } from './app-runtime-settings.js';

export type WindowLifecyclePolicyOptions = {
  getCloseBehavior: () => CloseBehavior;
  isQuitting: () => boolean;
  onHiddenToMenubar?: () => void;
  requestQuit: () => void;
  platform?: NodeJS.Platform;
};

export const bindMainWindowLifecyclePolicy = (
  window: BrowserWindow,
  options: WindowLifecyclePolicyOptions
): (() => void) => {
  const platform = options.platform ?? process.platform;
  const handleClose = (event: Electron.Event) => {
    if (options.isQuitting()) {
      return;
    }
    if (platform !== 'darwin') {
      return;
    }
    const closeBehavior = options.getCloseBehavior();
    if (closeBehavior === 'quit') {
      event.preventDefault();
      options.requestQuit();
      return;
    }
    if (closeBehavior !== 'hide_to_menubar') {
      return;
    }
    event.preventDefault();
    window.hide();
    options.onHiddenToMenubar?.();
  };

  window.on('close', handleClose);
  return () => {
    window.removeListener('close', handleClose);
  };
};

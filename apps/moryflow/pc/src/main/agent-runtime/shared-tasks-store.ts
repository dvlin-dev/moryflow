/**
 * [PROVIDES]: getSharedTasksStore - 主进程单例 TasksStore
 * [DEPENDS]: desktop-adapter, tasks-store, electron
 * [POS]: PC 主进程 TasksStore 单例与变更广播
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { BrowserWindow } from 'electron';
import type { TasksStore } from '@moryflow/agents-tools';
import { createDesktopCapabilities, createDesktopCrypto } from './desktop-adapter.js';
import { createDesktopTasksStore } from './tasks-store.js';

let sharedStore: TasksStore | null = null;

const broadcastTasksChange = () => {
  const payload = { changedAt: Date.now() };
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('tasks:changed', payload);
  }
};

export const getSharedTasksStore = (): TasksStore => {
  if (!sharedStore) {
    const capabilities = createDesktopCapabilities();
    const crypto = createDesktopCrypto();
    sharedStore = createDesktopTasksStore(capabilities, crypto, {
      onDatabaseChange: broadcastTasksChange,
    });
  }
  return sharedStore;
};

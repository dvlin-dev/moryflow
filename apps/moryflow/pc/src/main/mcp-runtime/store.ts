/**
 * [PROVIDES]: 受管 MCP Runtime 持久化状态存储（electron-store）
 * [DEPENDS]: electron-store, ./types
 * [POS]: main/mcp-runtime 状态落盘与读取
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import Store from 'electron-store';
import type { ManagedMcpRuntimeStateStore, ManagedRuntimeState } from './types.js';

export const createDefaultManagedRuntimeStateStore = (): ManagedMcpRuntimeStateStore => {
  const store = new Store<ManagedRuntimeState>({
    name: 'mcp-managed-runtime',
    defaults: {
      servers: {},
    },
  });

  return {
    read: () => {
      const current = store.store;
      if (!current || typeof current !== 'object') {
        return { servers: {} };
      }
      return {
        servers: current.servers ?? {},
      };
    },
    write: (next) => {
      store.store = next;
    },
  };
};

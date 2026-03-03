/**
 * [PROVIDES]: 受管 MCP Runtime 持久化状态存储（electron-store）
 * [DEPENDS]: electron-store, ./types
 * [POS]: main/mcp-runtime 状态落盘与读取
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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

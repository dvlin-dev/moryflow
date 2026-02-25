/**
 * [PROVIDES]: Tasks 只读服务（list/get）
 * [DEPENDS]: shared-tasks-store, vault
 * [POS]: 主进程 Tasks IPC 读模型入口
 * [UPDATE]: 2026-01-25 - 显式 chatId 读写分离
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { ListTasksQuery } from '@moryflow/agents-tools';
import type { TaskDetailResult } from '../../shared/ipc.js';
import { getSharedTasksStore } from '../agent-runtime/shared-tasks-store.js';
import { getStoredVault } from '../vault.js';

const resolveContext = async (chatId: string) => {
  const vault = await getStoredVault();
  if (!vault?.path) {
    throw new Error('vault_not_selected');
  }
  return { vaultRoot: vault.path, chatId };
};

export const listTasks = async (chatId: string, query?: ListTasksQuery) => {
  const store = getSharedTasksStore();
  const context = await resolveContext(chatId);
  await store.init({ vaultRoot: context.vaultRoot });
  return store.listTasks(context.chatId, query);
};

export const getTaskDetail = async (
  chatId: string,
  taskId: string
): Promise<TaskDetailResult | null> => {
  const store = getSharedTasksStore();
  const context = await resolveContext(chatId);
  await store.init({ vaultRoot: context.vaultRoot });
  const task = await store.getTask(context.chatId, taskId);
  if (!task) {
    return null;
  }
  const [dependencies, notes, files] = await Promise.all([
    store.listDependencies(context.chatId, taskId),
    store.listNotes(context.chatId, taskId),
    store.listFiles(context.chatId, taskId),
  ]);
  return { task, dependencies, notes, files };
};

/**
 * [PROVIDES]: Mobile Tasks 共享 Store + 只读服务
 * [DEPENDS]: mobile-adapter, tasks-store, vault
 * [POS]: Mobile 端 Tasks 数据读模型入口
 * [UPDATE]: 2026-01-25 - 显式 chatId 传递与 Vault 上下文隔离
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type {
  TasksStore,
  ListTasksQuery,
  TaskRecord,
  TaskDependency,
  TaskNote,
  TaskFile,
} from '@moryflow/agents-tools';
import { createMobileCapabilities, createMobileCrypto } from './mobile-adapter';
import { createMobileTasksStore } from './tasks-store';
import { getVaultRoot } from '../vault';

export type TaskDetailResult = {
  task: TaskRecord;
  dependencies: TaskDependency[];
  notes: TaskNote[];
  files: TaskFile[];
};

type TasksChangeHandler = () => void;

const listeners = new Set<TasksChangeHandler>();
let sharedStore: TasksStore | null = null;

const notify = () => {
  for (const handler of listeners) {
    handler();
  }
};

export const getSharedTasksStore = (): TasksStore => {
  if (!sharedStore) {
    const capabilities = createMobileCapabilities();
    const crypto = createMobileCrypto();
    sharedStore = createMobileTasksStore(capabilities, crypto, {
      onDatabaseChange: notify,
    });
  }
  return sharedStore;
};

export const onTasksChange = (handler: TasksChangeHandler) => {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
};

const resolveContext = async (chatId: string) => {
  const vaultRoot = await getVaultRoot();
  return { vaultRoot, chatId };
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

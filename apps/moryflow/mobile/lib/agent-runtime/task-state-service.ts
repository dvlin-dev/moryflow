/**
 * [INPUT]: chatId + task snapshot 更新请求
 * [OUTPUT]: TaskState snapshot
 * [POS]: Mobile 端 taskState 唯一写入口，基于 session-store 持久化
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { randomUUID } from 'expo-crypto';
import type { ChatSessionSummary } from '@moryflow/agents-runtime';
import {
  EMPTY_TASK_STATE,
  clearDoneTaskState,
  normalizeTaskState,
  type TaskItemInput,
  type TaskStateService,
} from '@moryflow/agents-tools';

type MobileTaskStateStore = {
  getSession(chatId: string): Promise<ChatSessionSummary | null>;
  setTaskState(
    chatId: string,
    taskState: ChatSessionSummary['taskState']
  ): Promise<ChatSessionSummary>;
};

type CreateMobileTaskStateServiceOptions = {
  store: MobileTaskStateStore;
  now?: () => number;
  createId?: () => string;
};

const requireSession = async (chatId: string, store: MobileTaskStateStore) => {
  const session = await store.getSession(chatId);
  if (!session) {
    throw new Error(`missing session: ${chatId}`);
  }
  return session;
};

export const createMobileTaskStateService = (
  options: CreateMobileTaskStateServiceOptions
): TaskStateService => {
  const now = options.now ?? Date.now;
  const createId = options.createId ?? randomUUID;
  const { store } = options;

  return {
    async get(chatId) {
      const session = await requireSession(chatId, store);
      return session.taskState ?? EMPTY_TASK_STATE;
    },

    async set(chatId, items: TaskItemInput[]) {
      const session = await requireSession(chatId, store);
      const currentTaskState = session.taskState;
      const nextTaskState = normalizeTaskState(currentTaskState, items, {
        now,
        createId,
      });

      if (currentTaskState && nextTaskState === currentTaskState) {
        return currentTaskState;
      }

      if (nextTaskState.items.length === 0) {
        if (!currentTaskState || currentTaskState.items.length === 0) {
          return EMPTY_TASK_STATE;
        }
        const updated = await store.setTaskState(chatId, undefined);
        return updated.taskState ?? EMPTY_TASK_STATE;
      }

      const updated = await store.setTaskState(chatId, nextTaskState);
      return updated.taskState ?? EMPTY_TASK_STATE;
    },

    async clearDone(chatId) {
      const session = await requireSession(chatId, store);
      const currentTaskState = session.taskState;
      if (!currentTaskState) {
        return EMPTY_TASK_STATE;
      }

      const nextTaskState = clearDoneTaskState(currentTaskState, now);
      if (nextTaskState === currentTaskState) {
        return currentTaskState;
      }

      if (nextTaskState.items.length === 0) {
        const updated = await store.setTaskState(chatId, undefined);
        return updated.taskState ?? EMPTY_TASK_STATE;
      }

      const updated = await store.setTaskState(chatId, nextTaskState);
      return updated.taskState ?? EMPTY_TASK_STATE;
    },
  };
};

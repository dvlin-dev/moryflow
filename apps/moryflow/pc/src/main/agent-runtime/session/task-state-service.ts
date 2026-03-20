/**
 * [INPUT]: chatId + task snapshot 更新请求
 * [OUTPUT]: TaskState snapshot + session updated 事件
 * [POS]: PC 主进程 taskState 唯一写入口，基于 chat session metadata 持久化
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { ChatSessionSummary } from '../../../shared/ipc.js';
import {
  EMPTY_TASK_STATE,
  clearDoneTaskState,
  normalizeTaskState,
  type TaskItemInput,
  type TaskState,
  type TaskStateService,
} from '@moryflow/agents-tools';
import { randomUUID } from 'node:crypto';

type TaskStateSummaryStore = {
  getSummary(chatId: string): ChatSessionSummary;
  setTaskState(chatId: string, taskState: TaskState | undefined): ChatSessionSummary;
};

type CreateDesktopTaskStateServiceOptions = {
  store: TaskStateSummaryStore;
  now?: () => number;
  createId?: () => string;
  emitSessionUpdated?: (session: ChatSessionSummary) => void;
};

const getSnapshot = (summary: ChatSessionSummary): TaskState =>
  summary.taskState ?? EMPTY_TASK_STATE;

const persistTaskState = (
  chatId: string,
  taskState: TaskState,
  store: TaskStateSummaryStore,
  emitSessionUpdated: (session: ChatSessionSummary) => void
) => {
  const session = store.setTaskState(chatId, taskState.items.length > 0 ? taskState : undefined);
  emitSessionUpdated(session);
  return getSnapshot(session);
};

export const createDesktopTaskStateService = (
  options: CreateDesktopTaskStateServiceOptions
): TaskStateService => {
  const now = options.now ?? Date.now;
  const createId = options.createId ?? randomUUID;
  const store = options.store;
  const emitSessionUpdated = options.emitSessionUpdated ?? (() => {});

  return {
    async get(chatId) {
      return getSnapshot(store.getSummary(chatId));
    },

    async set(chatId, items: TaskItemInput[]) {
      const currentSummary = store.getSummary(chatId);
      const currentTaskState = currentSummary.taskState;
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
        return persistTaskState(chatId, EMPTY_TASK_STATE, store, emitSessionUpdated);
      }

      return persistTaskState(chatId, nextTaskState, store, emitSessionUpdated);
    },

    async clearDone(chatId) {
      const currentSummary = store.getSummary(chatId);
      const currentTaskState = currentSummary.taskState;
      if (!currentTaskState) {
        return EMPTY_TASK_STATE;
      }

      const nextTaskState = clearDoneTaskState(currentTaskState, now);
      if (nextTaskState === currentTaskState) {
        return currentTaskState;
      }

      if (nextTaskState.items.length === 0) {
        return persistTaskState(chatId, EMPTY_TASK_STATE, store, emitSessionUpdated);
      }

      return persistTaskState(chatId, nextTaskState, store, emitSessionUpdated);
    },
  };
};

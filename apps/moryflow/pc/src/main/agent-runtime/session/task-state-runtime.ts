/**
 * [PROVIDES]: createRuntimeTaskStateService
 * [DEPENDS]: createDesktopTaskStateService, chatSessionStore, broadcastSessionEvent
 * [POS]: PC 主进程 taskState 持久化/广播桥接，负责把唯一写入口接到 session event
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { chatSessionStore } from '../../chat-session-store/index.js';
import { broadcastSessionEvent } from '../../chat/services/broadcast/event-bus.js';
import { createDesktopTaskStateService } from './task-state-service.js';

export const createRuntimeTaskStateService = () =>
  createDesktopTaskStateService({
    store: {
      getSummary: (chatId) => chatSessionStore.getSummary(chatId),
      setTaskState: (chatId, taskState) => chatSessionStore.setTaskState(chatId, taskState),
    },
    emitSessionUpdated: (session) => {
      broadcastSessionEvent({ type: 'updated', session });
    },
  });

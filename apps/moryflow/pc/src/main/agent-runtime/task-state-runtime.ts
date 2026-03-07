/**
 * [PROVIDES]: createRuntimeTaskStateService
 * [DEPENDS]: createDesktopTaskStateService, chatSessionStore, broadcastSessionEvent
 * [POS]: PC 主进程 taskState 持久化/广播桥接，负责把唯一写入口接到 session event
 * [UPDATE]: 2026-03-07 - 从 runtime 主入口抽离 taskState 组装，锁住 setTaskState -> broadcastSessionEvent 集成链
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { chatSessionStore } from '../chat-session-store/index.js';
import { broadcastSessionEvent } from '../chat/broadcast.js';
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

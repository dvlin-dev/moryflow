/**
 * [PROVIDES]: useChatSessions - Chat sessions 单一数据源（跨组件共享）
 * [DEPENDS]: zustand (vanilla), desktopAPI.chat IPC
 * [POS]: Chat session 状态与动作统一入口，供 ChatPane 与 Chat Mode Sidebar 复用
 * [UPDATE]: 2026-02-26 - 生命周期运行时封装到 chatSessionsRuntime，显式管理订阅获取/释放
 * [UPDATE]: 2026-02-09 - 引入订阅引用计数，最后一个订阅者卸载时释放 session listener
 * [UPDATE]: 2026-03-05 - 权限模式改为全局状态（get/set + onGlobalModeChanged）
 * [UPDATE]: 2026-03-07 - sessions 快照只由 hydrate/session-event 收口，命令侧不再本地 patch 会话列表
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useMemo } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { ChatGlobalPermissionMode, ChatSessionEvent, ChatSessionSummary } from '@shared/ipc';

const sortSessions = (items: ChatSessionSummary[]) =>
  [...items].sort((a, b) => b.updatedAt - a.updatedAt);

const upsertSession = (items: ChatSessionSummary[], session: ChatSessionSummary) => {
  const next = items.filter((item) => item.id !== session.id);
  next.push(session);
  return sortSessions(next);
};

const removeSession = (items: ChatSessionSummary[], sessionId: string) =>
  items.filter((item) => item.id !== sessionId);

const resolveNextActiveId = (
  sessions: ChatSessionSummary[],
  activeSessionId: string | null
): string | null => {
  if (!activeSessionId) {
    return sessions[0]?.id ?? null;
  }
  return sessions.some((item) => item.id === activeSessionId)
    ? activeSessionId
    : (sessions[0]?.id ?? null);
};

type ChatSessionsState = {
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  globalMode: ChatGlobalPermissionMode;
  hydrated: boolean;
  selectSession: (sessionId: string) => void;
  createSession: () => Promise<ChatSessionSummary | null>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  setGlobalMode: (mode: ChatGlobalPermissionMode, sessionId?: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
};

const chatSessionsStore = createStore<ChatSessionsState>((set) => ({
  sessions: [],
  activeSessionId: null,
  globalMode: 'ask',
  hydrated: false,

  selectSession: (sessionId) => {
    set({ activeSessionId: sessionId });
  },

  createSession: async () => {
    const api = window.desktopAPI?.chat;
    if (!api) {
      return null;
    }
    const session = await api.createSession();
    set({
      activeSessionId: session.id,
      hydrated: true,
    });
    return session;
  },

  renameSession: async (sessionId: string, title: string) => {
    const api = window.desktopAPI?.chat;
    if (!api) {
      return;
    }
    await api.renameSession({ sessionId, title });
    set({ hydrated: true });
  },

  setGlobalMode: async (mode: ChatGlobalPermissionMode, sessionId?: string) => {
    const api = window.desktopAPI?.chat;
    if (!api) {
      return;
    }
    const nextMode = await api.setGlobalMode({ mode, sessionId });
    set({ globalMode: nextMode, hydrated: true });
  },

  deleteSession: async (sessionId: string) => {
    const api = window.desktopAPI?.chat;
    if (!api) {
      return;
    }
    await api.deleteSession({ sessionId });
    set({ hydrated: true });
  },
}));

const applySessionEvent = (event: ChatSessionEvent) => {
  chatSessionsStore.setState((state) => {
    if (event.type === 'deleted') {
      const nextSessions = removeSession(state.sessions, event.sessionId);
      return {
        sessions: nextSessions,
        activeSessionId: resolveNextActiveId(nextSessions, state.activeSessionId),
        hydrated: true,
      };
    }

    const nextSessions = upsertSession(state.sessions, event.session);
    return {
      sessions: nextSessions,
      activeSessionId: resolveNextActiveId(nextSessions, state.activeSessionId),
      hydrated: true,
    };
  });
};

const applyGlobalModeEvent = (event: { mode: ChatGlobalPermissionMode }) => {
  chatSessionsStore.setState({ globalMode: event.mode, hydrated: true });
};

const chatSessionsRuntime = (() => {
  let hydratePromise: Promise<void> | null = null;
  let disposeSessionListener: (() => void) | null = null;
  let disposeGlobalModeListener: (() => void) | null = null;
  let subscriberCount = 0;

  const ensureListeners = () => {
    const api = window.desktopAPI?.chat;
    if (!api) {
      return;
    }
    if (subscriberCount > 0 && !disposeSessionListener) {
      disposeSessionListener = api.onSessionEvent(applySessionEvent);
    }
    if (subscriberCount > 0 && !disposeGlobalModeListener) {
      disposeGlobalModeListener = api.onGlobalModeChanged(applyGlobalModeEvent);
    }
  };

  const disposeListenersIfIdle = () => {
    if (subscriberCount !== 0) {
      return;
    }
    disposeSessionListener?.();
    disposeGlobalModeListener?.();
    disposeSessionListener = null;
    disposeGlobalModeListener = null;
  };

  const ensureHydrated = async () => {
    const state = chatSessionsStore.getState();
    ensureListeners();
    if (state.hydrated) {
      return;
    }

    if (!hydratePromise) {
      hydratePromise = (async () => {
        const api = window.desktopAPI?.chat;
        if (!api) {
          chatSessionsStore.setState({ hydrated: true });
          return;
        }

        try {
          const globalMode = await api.getGlobalMode();
          let list = await api.listSessions();
          if (list.length === 0) {
            const created = await api.createSession();
            list = [created];
          }

          const sorted = sortSessions(list);
          chatSessionsStore.setState((prev) => ({
            sessions: sorted,
            activeSessionId: resolveNextActiveId(sorted, prev.activeSessionId),
            globalMode,
            hydrated: true,
          }));

          ensureListeners();
        } catch (error) {
          console.error('[chat-sessions] failed to hydrate sessions', error);
          chatSessionsStore.setState({ hydrated: true });
        }
      })().finally(() => {
        hydratePromise = null;
      });
    }

    await hydratePromise;
  };

  return {
    acquireSubscriber: () => {
      subscriberCount += 1;
      void ensureHydrated();
    },
    releaseSubscriber: () => {
      subscriberCount = Math.max(0, subscriberCount - 1);
      disposeListenersIfIdle();
    },
    reset: () => {
      disposeSessionListener?.();
      disposeGlobalModeListener?.();
      disposeSessionListener = null;
      disposeGlobalModeListener = null;
      hydratePromise = null;
      subscriberCount = 0;
    },
  };
})();

export const __resetChatSessionsStoreForTest = () => {
  chatSessionsRuntime.reset();
  chatSessionsStore.setState({
    sessions: [],
    activeSessionId: null,
    globalMode: 'ask',
    hydrated: false,
  });
};

export const useChatSessions = () => {
  const sessions = useStore(chatSessionsStore, (s) => s.sessions);
  const activeSessionId = useStore(chatSessionsStore, (s) => s.activeSessionId);
  const globalMode = useStore(chatSessionsStore, (s) => s.globalMode);
  const hydrated = useStore(chatSessionsStore, (s) => s.hydrated);
  const selectSession = useStore(chatSessionsStore, (s) => s.selectSession);
  const createSession = useStore(chatSessionsStore, (s) => s.createSession);
  const renameSession = useStore(chatSessionsStore, (s) => s.renameSession);
  const setGlobalMode = useStore(chatSessionsStore, (s) => s.setGlobalMode);
  const deleteSession = useStore(chatSessionsStore, (s) => s.deleteSession);

  useEffect(() => {
    chatSessionsRuntime.acquireSubscriber();
    return () => {
      chatSessionsRuntime.releaseSubscriber();
    };
  }, []);

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  return {
    sessions,
    activeSession,
    activeSessionId,
    selectSession,
    createSession,
    renameSession,
    globalMode,
    setGlobalMode,
    deleteSession,
    isReady: hydrated && Boolean(activeSessionId),
  };
};

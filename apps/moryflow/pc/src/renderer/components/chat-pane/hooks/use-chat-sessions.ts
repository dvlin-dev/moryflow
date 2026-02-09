/**
 * [PROVIDES]: useChatSessions - Chat sessions 单一数据源（跨组件共享）
 * [DEPENDS]: zustand (vanilla), desktopAPI.chat IPC
 * [POS]: Chat session 状态与动作统一入口，供 ChatPane 与 Chat Mode Sidebar 复用
 * [UPDATE]: 2026-02-09 - 引入订阅引用计数，最后一个订阅者卸载时释放 session listener
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useMemo } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { ChatSessionEvent, ChatSessionSummary } from '@shared/ipc';

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
  hydrated: boolean;
  selectSession: (sessionId: string) => void;
  createSession: () => Promise<ChatSessionSummary | null>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  updateSessionMode: (sessionId: string, mode: ChatSessionSummary['mode']) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
};

const chatSessionsStore = createStore<ChatSessionsState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
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
    set((state) => ({
      sessions: upsertSession(state.sessions, session),
      activeSessionId: session.id,
      hydrated: true,
    }));
    return session;
  },

  renameSession: async (sessionId: string, title: string) => {
    const api = window.desktopAPI?.chat;
    if (!api) {
      return;
    }
    const session = await api.renameSession({ sessionId, title });
    set((state) => ({
      sessions: upsertSession(state.sessions, session),
      hydrated: true,
    }));
  },

  updateSessionMode: async (sessionId: string, mode: ChatSessionSummary['mode']) => {
    const api = window.desktopAPI?.chat;
    if (!api) {
      return;
    }
    const session = await api.updateSessionMode({ sessionId, mode });
    set((state) => ({
      sessions: upsertSession(state.sessions, session),
      hydrated: true,
    }));
  },

  deleteSession: async (sessionId: string) => {
    const api = window.desktopAPI?.chat;
    if (!api) {
      return;
    }
    await api.deleteSession({ sessionId });
    set((state) => {
      const nextSessions = removeSession(state.sessions, sessionId);
      return {
        sessions: nextSessions,
        activeSessionId: resolveNextActiveId(nextSessions, state.activeSessionId),
        hydrated: true,
      };
    });
  },
}));

let hydratePromise: Promise<void> | null = null;
let disposeSessionListener: (() => void) | null = null;
let subscriberCount = 0;

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

const ensureSessionListener = () => {
  const api = window.desktopAPI?.chat;
  if (!api) {
    return;
  }
  if (subscriberCount > 0 && !disposeSessionListener) {
    disposeSessionListener = api.onSessionEvent(applySessionEvent);
  }
};

const disposeSessionListenerIfIdle = () => {
  if (subscriberCount === 0 && disposeSessionListener) {
    disposeSessionListener();
    disposeSessionListener = null;
  }
};

const ensureHydrated = async () => {
  const state = chatSessionsStore.getState();
  ensureSessionListener();
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
        let list = await api.listSessions();
        if (list.length === 0) {
          const created = await api.createSession();
          list = [created];
        }

        const sorted = sortSessions(list);
        chatSessionsStore.setState((prev) => ({
          sessions: sorted,
          activeSessionId: resolveNextActiveId(sorted, prev.activeSessionId),
          hydrated: true,
        }));

        ensureSessionListener();
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

export const __resetChatSessionsStoreForTest = () => {
  disposeSessionListener?.();
  disposeSessionListener = null;
  hydratePromise = null;
  subscriberCount = 0;
  chatSessionsStore.setState({
    sessions: [],
    activeSessionId: null,
    hydrated: false,
  });
};

export const useChatSessions = () => {
  const sessions = useStore(chatSessionsStore, (s) => s.sessions);
  const activeSessionId = useStore(chatSessionsStore, (s) => s.activeSessionId);
  const hydrated = useStore(chatSessionsStore, (s) => s.hydrated);
  const selectSession = useStore(chatSessionsStore, (s) => s.selectSession);
  const createSession = useStore(chatSessionsStore, (s) => s.createSession);
  const renameSession = useStore(chatSessionsStore, (s) => s.renameSession);
  const updateSessionMode = useStore(chatSessionsStore, (s) => s.updateSessionMode);
  const deleteSession = useStore(chatSessionsStore, (s) => s.deleteSession);

  useEffect(() => {
    subscriberCount += 1;
    void ensureHydrated();
    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1);
      disposeSessionListenerIfIdle();
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
    updateSessionMode,
    deleteSession,
    isReady: hydrated && Boolean(activeSessionId),
  };
};

/**
 * 会话管理 Hook
 *
 * 与 PC 端 chat-pane/hooks/use-chat-sessions.ts 保持一致
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  getSessions,
  createSession as createSessionApi,
  deleteSession as deleteSessionApi,
  updateSession as updateSessionApi,
  recordModeSwitch,
} from '@/lib/agent-runtime';
import { randomUUID } from 'expo-crypto';
import type { ChatSessionSummary } from '@anyhunt/agents-runtime';

// 重新导出类型
export type { ChatSessionSummary };

const sortSessions = (items: ChatSessionSummary[]) =>
  [...items].sort((a, b) => b.updatedAt - a.updatedAt);

const upsertSession = (items: ChatSessionSummary[], session: ChatSessionSummary) => {
  const next = items.filter((item) => item.id !== session.id);
  next.push(session);
  return sortSessions(next);
};

const removeSession = (items: ChatSessionSummary[], sessionId: string) =>
  items.filter((item) => item.id !== sessionId);

/**
 * 获取和管理会话列表
 * 与 PC 端 useChatSessions 保持一致的 API
 */
export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const selectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  const assignInitialActive = useCallback(
    (nextSessions: ChatSessionSummary[]) => {
      if (!activeSessionId && nextSessions.length > 0) {
        setActiveSessionId(nextSessions[0].id);
      } else if (activeSessionId && !nextSessions.some((item) => item.id === activeSessionId)) {
        setActiveSessionId(nextSessions[0]?.id ?? null);
      }
    },
    [activeSessionId]
  );

  // 初始化加载
  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        let list = await getSessions();
        if (!mounted) return;

        if (list.length === 0) {
          const created = await createSessionApi();
          list = [created];
        }
        const sorted = sortSessions(list);
        setSessions(sorted);
        assignInitialActive(sorted);
      } catch (error) {
        console.error('[useChatSessions] failed to load chat sessions', error);
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    };
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [assignInitialActive]);

  const createSession = useCallback(async (title?: string) => {
    try {
      const session = await createSessionApi(title);
      setSessions((prev) => upsertSession(prev, session));
      setActiveSessionId(session.id);
      return session;
    } catch (error) {
      console.error('[useChatSessions] failed to create session', error);
      return null;
    }
  }, []);

  const renameSession = useCallback(async (sessionId: string, title: string) => {
    try {
      await updateSessionApi(sessionId, { title });
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title, updatedAt: Date.now() } : s))
      );
    } catch (error) {
      console.error('[useChatSessions] failed to rename session', error);
    }
  }, []);

  const updateSessionMode = useCallback(
    async (sessionId: string, mode: ChatSessionSummary['mode']) => {
      try {
        const previousMode = sessions.find((session) => session.id === sessionId)?.mode ?? 'agent';
        if (previousMode === mode) {
          return;
        }
        await updateSessionApi(sessionId, { mode });
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, mode, updatedAt: Date.now() } : s))
        );
        void recordModeSwitch({
          eventId: randomUUID(),
          sessionId,
          previousMode,
          nextMode: mode,
          source: 'mobile',
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('[useChatSessions] failed to update session mode', error);
      }
    },
    [sessions]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await deleteSessionApi(sessionId);
        setSessions((prev) => {
          const next = removeSession(prev, sessionId);
          assignInitialActive(next);
          return next;
        });
      } catch (error) {
        console.error('[useChatSessions] failed to delete session', error);
      }
    },
    [assignInitialActive]
  );

  const refreshSessions = useCallback(async () => {
    try {
      const list = await getSessions();
      const sorted = sortSessions(list);
      setSessions(sorted);
    } catch (error) {
      console.error('[useChatSessions] failed to refresh sessions', error);
    }
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
    refreshSessions,
    isReady: isReady && Boolean(activeSessionId),
  };
}

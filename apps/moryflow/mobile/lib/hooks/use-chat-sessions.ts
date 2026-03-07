/**
 * 会话管理 Hook
 *
 * 与 PC 端 chat-pane/hooks/use-chat-sessions.ts 保持一致
 * [UPDATE]: 2026-03-07 - sessions 只由 bootstrap/refresh/session-event 收口，命令侧不再本地 patch 会话快照
 * [UPDATE]: 2026-03-06 - 权限模式改为全局状态（get/setGlobalPermissionMode），移除 session.mode 更新
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  getSessions,
  createSession as createSessionApi,
  deleteSession as deleteSessionApi,
  renameSession as renameSessionApi,
  onSessionEvent,
  getGlobalPermissionMode,
  setGlobalPermissionMode,
  recordModeSwitch,
} from '@/lib/agent-runtime';
import { randomUUID } from 'expo-crypto';
import type { AgentAccessMode, ChatSessionSummary } from '@moryflow/agents-runtime';
import { resolveActiveSessionId } from './session-selection';

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
  const [globalMode, setGlobalModeState] = useState<AgentAccessMode>('ask');
  const [isReady, setIsReady] = useState(false);

  const selectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  const assignInitialActive = useCallback((nextSessions: ChatSessionSummary[]) => {
    setActiveSessionId((prev) => resolveActiveSessionId(prev, nextSessions));
  }, []);

  // 初始化加载
  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const [loadedSessions, loadedGlobalMode] = await Promise.all([
          getSessions(),
          getGlobalPermissionMode(),
        ]);
        let list = loadedSessions;
        if (!mounted) return;

        if (list.length === 0) {
          const created = await createSessionApi();
          list = [created];
        }
        const sorted = sortSessions(list);
        setSessions(sorted);
        setGlobalModeState(loadedGlobalMode);
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

  useEffect(() => {
    return onSessionEvent((event) => {
      setSessions((prev) => {
        switch (event.type) {
          case 'created':
          case 'updated': {
            const next = upsertSession(prev, event.session);
            assignInitialActive(next);
            return next;
          }
          case 'deleted': {
            const next = removeSession(prev, event.sessionId);
            assignInitialActive(next);
            return next;
          }
        }
      });
    });
  }, [assignInitialActive]);

  const createSession = useCallback(async (title?: string) => {
    const session = await createSessionApi(title);
    setActiveSessionId(session.id);
    return session;
  }, []);

  const renameSession = useCallback(async (sessionId: string, title: string) => {
    await renameSessionApi(sessionId, title);
  }, []);

  const setGlobalMode = useCallback(
    async (mode: AgentAccessMode, sessionId?: string) => {
      try {
        const previousMode = globalMode;
        if (previousMode === mode) {
          return;
        }
        const result = await setGlobalPermissionMode(mode);
        setGlobalModeState(result.mode);
        const auditSessionId = sessionId ?? activeSessionId;
        if (!auditSessionId) {
          return;
        }
        void recordModeSwitch({
          eventId: randomUUID(),
          sessionId: auditSessionId,
          previousMode,
          nextMode: result.mode,
          source: 'mobile',
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('[useChatSessions] failed to update global mode', error);
      }
    },
    [activeSessionId, globalMode]
  );

  const deleteSession = useCallback(async (sessionId: string) => {
    await deleteSessionApi(sessionId);
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const list = await getSessions();
      const sorted = sortSessions(list);
      setSessions(sorted);
      assignInitialActive(sorted);
    } catch (error) {
      console.error('[useChatSessions] failed to refresh sessions', error);
    }
  }, [assignInitialActive]);

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  return {
    sessions,
    activeSession,
    activeSessionId,
    globalMode,
    selectSession,
    createSession,
    renameSession,
    setGlobalMode,
    deleteSession,
    refreshSessions,
    isReady: isReady && Boolean(activeSessionId),
  };
}

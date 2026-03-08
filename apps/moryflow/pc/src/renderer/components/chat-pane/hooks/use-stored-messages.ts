/**
 * [PROVIDES]: useStoredMessages - 会话切换历史消息加载
 * [DEPENDS]: desktopAPI.chat, React hooks
 * [POS]: ChatPane 会话历史补齐
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { UIMessage } from 'ai';

type SetMessagesFn = (messages: UIMessage[]) => void;

/**
 * 会话切换时补齐历史消息，失败时回退为空数组避免界面卡死。
 */
export const useStoredMessages = ({
  activeSessionId,
  setMessages,
}: {
  activeSessionId?: string | null;
  setMessages: SetMessagesFn;
}) => {
  const currentSessionIdRef = useRef<string | null>(activeSessionId ?? null);
  const latestRevisionBySessionRef = useRef<Map<string, number>>(new Map());
  const appliedGenerationBySessionRef = useRef<Map<string, number>>(new Map());
  const sessionSwitchGenerationRef = useRef(0);

  useLayoutEffect(() => {
    sessionSwitchGenerationRef.current += 1;
    currentSessionIdRef.current = activeSessionId ?? null;
    setMessages([]);
  }, [activeSessionId, setMessages]);

  useEffect(() => {
    if (!activeSessionId || !window.desktopAPI?.chat?.getSessionMessages) {
      return;
    }
    let cancelled = false;
    const generation = sessionSwitchGenerationRef.current;
    const getLatestRevision = () => latestRevisionBySessionRef.current.get(activeSessionId) ?? -1;
    const setLatestRevision = (revision: number) => {
      latestRevisionBySessionRef.current.set(activeSessionId, revision);
    };
    const getAppliedGeneration = () => appliedGenerationBySessionRef.current.get(activeSessionId);
    const markAppliedGeneration = () => {
      appliedGenerationBySessionRef.current.set(activeSessionId, generation);
    };

    const loadMessages = async () => {
      try {
        const stored = await window.desktopAPI.chat.getSessionMessages({
          sessionId: activeSessionId,
        });
        if (cancelled) {
          return;
        }
        if (currentSessionIdRef.current !== activeSessionId) {
          return;
        }
        const latestRevision = getLatestRevision();
        const appliedGeneration = getAppliedGeneration();
        if (stored.revision < latestRevision) {
          return;
        }
        if (stored.revision === latestRevision && appliedGeneration === generation) {
          return;
        }
        setLatestRevision(stored.revision);
        markAppliedGeneration();
        setMessages(stored.messages ?? []);
      } catch (error) {
        console.error('[chat-pane] failed to load session messages', error);
        if (cancelled) {
          return;
        }
        // 如果已经有实时事件，不再回退为空，避免覆盖更“新”的事件态 UI。
        if (currentSessionIdRef.current !== activeSessionId) {
          return;
        }
        if (getLatestRevision() < 0) {
          setMessages([]);
        }
      }
    };
    void loadMessages();
    return () => {
      cancelled = true;
    };
  }, [activeSessionId, setMessages]);

  useEffect(() => {
    if (!activeSessionId || !window.desktopAPI?.chat?.onMessageEvent) {
      return;
    }
    const dispose = window.desktopAPI.chat.onMessageEvent((event) => {
      const currentSessionId = currentSessionIdRef.current;
      if (!currentSessionId) {
        return;
      }
      if (event.sessionId !== currentSessionId) {
        return;
      }
      const latestRevision = latestRevisionBySessionRef.current.get(currentSessionId) ?? -1;
      if (event.revision <= latestRevision) {
        return;
      }
      latestRevisionBySessionRef.current.set(currentSessionId, event.revision);
      appliedGenerationBySessionRef.current.set(
        currentSessionId,
        sessionSwitchGenerationRef.current
      );
      if (event.type === 'deleted') {
        setMessages([]);
        return;
      }
      setMessages(event.messages ?? []);
    });
    return () => {
      dispose();
    };
  }, [activeSessionId, setMessages]);
};

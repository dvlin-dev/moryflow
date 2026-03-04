/**
 * [PROVIDES]: useStoredMessages - 会话切换历史消息加载
 * [DEPENDS]: desktopAPI.chat, React hooks
 * [POS]: ChatPane 会话历史补齐
 * [UPDATE]: 2026-02-03 - 切换会话先清空消息，避免旧会话残留
 * [UPDATE]: 2026-03-04 - 新增 chat:message-event 订阅，当前会话正文实时刷新
 * [UPDATE]: 2026-03-05 - 增加 revision 新鲜度判定，防止初始加载覆盖实时消息
 * [UPDATE]: 2026-03-05 - revision 新鲜度改为按 session 隔离，避免切会话后旧事件污染新会话加载
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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

  useLayoutEffect(() => {
    currentSessionIdRef.current = activeSessionId ?? null;
    setMessages([]);
  }, [activeSessionId, setMessages]);

  useEffect(() => {
    if (!activeSessionId || !window.desktopAPI?.chat?.getSessionMessages) {
      return;
    }
    let cancelled = false;
    const getLatestRevision = () => latestRevisionBySessionRef.current.get(activeSessionId) ?? -1;
    const setLatestRevision = (revision: number) => {
      latestRevisionBySessionRef.current.set(activeSessionId, revision);
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
        if (stored.revision <= getLatestRevision()) {
          return;
        }
        setLatestRevision(stored.revision);
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

/**
 * [PROVIDES]: useStoredMessages - 会话切换历史消息加载
 * [DEPENDS]: desktopAPI.chat, React hooks
 * [POS]: ChatPane 会话历史补齐
 * [UPDATE]: 2026-02-03 - 切换会话先清空消息，避免旧会话残留
 * [UPDATE]: 2026-03-04 - 新增 chat:message-event 订阅，当前会话正文实时刷新
 * [UPDATE]: 2026-03-05 - 增加 revision 新鲜度判定，防止初始加载覆盖实时消息
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
  const latestRevisionRef = useRef(-1);

  useLayoutEffect(() => {
    latestRevisionRef.current = -1;
    setMessages([]);
  }, [activeSessionId, setMessages]);

  useEffect(() => {
    if (!activeSessionId || !window.desktopAPI?.chat?.getSessionMessages) {
      return;
    }
    let cancelled = false;
    const loadMessages = async () => {
      try {
        const stored = await window.desktopAPI.chat.getSessionMessages({
          sessionId: activeSessionId,
        });
        if (cancelled) {
          return;
        }
        if (stored.revision <= latestRevisionRef.current) {
          return;
        }
        latestRevisionRef.current = stored.revision;
        setMessages(stored.messages ?? []);
      } catch (error) {
        console.error('[chat-pane] failed to load session messages', error);
        if (cancelled) {
          return;
        }
        // 如果已经有实时事件，不再回退为空，避免覆盖更“新”的事件态 UI。
        if (latestRevisionRef.current < 0) {
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
      if (event.sessionId !== activeSessionId) {
        return;
      }
      if (event.revision <= latestRevisionRef.current) {
        return;
      }
      latestRevisionRef.current = event.revision;
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

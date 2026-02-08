/**
 * [PROVIDES]: useStoredMessages - 会话切换历史消息加载
 * [DEPENDS]: desktopAPI.chat, React hooks
 * [POS]: ChatPane 会话历史补齐
 * [UPDATE]: 2026-02-03 - 切换会话先清空消息，避免旧会话残留
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useLayoutEffect } from 'react';
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
  useLayoutEffect(() => {
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
        if (!cancelled) {
          setMessages(stored ?? []);
        }
      } catch (error) {
        console.error('[chat-pane] failed to load session messages', error);
        if (!cancelled) {
          setMessages([]);
        }
      }
    };
    void loadMessages();
    return () => {
      cancelled = true;
    };
  }, [activeSessionId, setMessages]);
};

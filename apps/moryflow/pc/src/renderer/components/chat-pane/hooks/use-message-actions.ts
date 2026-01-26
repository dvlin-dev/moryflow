import { useCallback } from 'react';
import type { UIMessage } from 'ai';
import type { MessageActionHandlers } from '../components/message/const';

type UseMessageActionsParams = {
  sessionId: string | null;
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  regenerate: (options?: { messageId?: string }) => Promise<void>;
  selectSession: (sessionId: string) => void;
  preferredModelId?: string | null;
};

/**
 * 消息操作 hook，提供重发、重试、编辑重发、分支功能
 */
export const useMessageActions = ({
  sessionId,
  messages,
  setMessages,
  regenerate,
  selectSession,
  preferredModelId,
}: UseMessageActionsParams): Required<MessageActionHandlers> => {
  const prepareCompactionIfNeeded = useCallback(async () => {
    if (!sessionId || !window.desktopAPI?.chat?.prepareCompaction) {
      return;
    }
    try {
      const result = await window.desktopAPI.chat.prepareCompaction({
        sessionId,
        preferredModelId: preferredModelId ?? undefined,
      });
      if (result.changed && Array.isArray(result.messages)) {
        setMessages(result.messages);
      }
    } catch (error) {
      console.warn('[chat-pane] prepareCompaction failed', error);
    }
  }, [sessionId, preferredModelId, setMessages]);
  /**
   * 从指定索引重新发送消息
   * 截断后续消息，使用 regenerate 重新触发 AI 回复
   */
  const onResend = useCallback(
    async (messageIndex: number) => {
      if (!sessionId || !window.desktopAPI?.chat) {
        return;
      }
      // 截断到指定索引（保留该消息）
      await window.desktopAPI.chat.truncateSession({ sessionId, index: messageIndex });
      // 更新本地 messages 状态为截断后的版本
      const truncated = messages.slice(0, messageIndex + 1);
      setMessages(truncated);
      await prepareCompactionIfNeeded();
      // 使用 regenerate 触发 AI 重新回复（不会添加新的用户消息）
      await regenerate();
    },
    [sessionId, messages, setMessages, regenerate, prepareCompactionIfNeeded]
  );

  /**
   * 重试最后一条 assistant 消息
   * 删除最后的 assistant 回复，重新生成
   */
  const onRetry = useCallback(async () => {
    if (!sessionId || !window.desktopAPI?.chat || messages.length < 2) {
      return;
    }
    // 找到最后一条 user 消息的索引
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex < 0) {
      return;
    }
    // 截断到最后一条 user 消息
    await window.desktopAPI.chat.truncateSession({ sessionId, index: lastUserIndex });
    const truncated = messages.slice(0, lastUserIndex + 1);
    setMessages(truncated);
    await prepareCompactionIfNeeded();
    // 使用 regenerate 触发 AI 重新回复
    await regenerate();
  }, [sessionId, messages, setMessages, regenerate, prepareCompactionIfNeeded]);

  /**
   * 编辑消息内容后重新发送
   */
  const onEditAndResend = useCallback(
    async (messageIndex: number, newContent: string) => {
      if (!sessionId || !window.desktopAPI?.chat) {
        return;
      }
      // 截断到该消息位置
      await window.desktopAPI.chat.truncateSession({ sessionId, index: messageIndex });
      // 替换内容
      await window.desktopAPI.chat.replaceMessage({
        sessionId,
        index: messageIndex,
        content: newContent,
      });
      // 更新本地状态，创建新的用户消息
      const truncated = messages.slice(0, messageIndex);
      const editedMessage: UIMessage = {
        ...messages[messageIndex],
        parts: [{ type: 'text', text: newContent }],
      };
      setMessages([...truncated, editedMessage]);
      await prepareCompactionIfNeeded();
      // 使用 regenerate 触发 AI 回复
      await regenerate();
    },
    [sessionId, messages, setMessages, regenerate, prepareCompactionIfNeeded]
  );

  /**
   * 从指定位置分支出新会话
   */
  const onFork = useCallback(
    async (messageIndex: number) => {
      if (!sessionId || !window.desktopAPI?.chat) {
        return;
      }
      const newSession = await window.desktopAPI.chat.forkSession({
        sessionId,
        atIndex: messageIndex,
      });
      // 切换到新会话
      selectSession(newSession.id);
    },
    [sessionId, selectSession]
  );

  return { onResend, onRetry, onEditAndResend, onFork };
};

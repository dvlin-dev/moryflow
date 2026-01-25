/**
 * Chat State Hook
 *
 * 管理聊天状态：Transport、消息、发送/停止
 */

import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { MobileChatTransport } from '@/lib/chat';
import { saveUiMessages, generateSessionTitle } from '@/lib/agent-runtime';
import { TEMP_AI_MESSAGE_ID } from '../contexts';
import type { SendMessagePayload } from '../ChatInputBar';

interface UseChatStateOptions {
  /** 当前会话 ID */
  activeSessionId: string | null;
  /** 选中的模型 ID */
  selectedModelId: string | null;
  /** 刷新会话列表回调 */
  refreshSessions: () => void;
}

interface UseChatStateResult {
  /** 消息列表 */
  messages: UIMessage[];
  /** 用于显示的消息列表（可能包含占位消息） */
  displayMessages: UIMessage[];
  /** 聊天状态 */
  status: 'ready' | 'submitted' | 'streaming' | 'error';
  /** 错误信息 */
  error: Error | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否正在流式输出 */
  isStreaming: boolean;
  /** 发送消息 */
  sendMessage: (payload: SendMessagePayload) => Promise<void>;
  /** 停止生成 */
  stop: () => void;
  /** 设置消息列表 */
  setMessages: (messages: UIMessage[]) => void;
  /** 更新工具审批状态 */
  addToolApprovalResponse: (input: { id: string; approved: boolean; reason?: string }) => void;
}

/**
 * 管理聊天状态
 */
export function useChatState({
  activeSessionId,
  selectedModelId,
  refreshSessions,
}: UseChatStateOptions): UseChatStateResult {
  // Transport - 依赖 selectedModelId
  const transport = useMemo(
    () => new MobileChatTransport({ preferredModelId: selectedModelId ?? undefined }),
    [selectedModelId]
  );

  // Chat 状态
  const {
    messages,
    status,
    error,
    sendMessage: sdkSendMessage,
    stop,
    setMessages,
    addToolApprovalResponse,
  } = useChat({
    id: activeSessionId ?? 'pending',
    transport,
  });

  // 派生状态
  const isLoading = status === 'submitted' || status === 'streaming';
  const lastMessage = messages[messages.length - 1];
  const isStreaming = status === 'streaming' && lastMessage?.role === 'assistant';

  // 构建显示用的消息列表
  const displayMessages = useMemo(() => {
    const needsPlaceholder = isLoading && lastMessage?.role === 'user';

    if (!needsPlaceholder) {
      return messages;
    }

    // 插入临时 AI 占位消息
    const placeholderMessage = {
      id: TEMP_AI_MESSAGE_ID,
      role: 'assistant' as const,
      parts: [],
      createdAt: new Date(),
    };
    return [...messages, placeholderMessage];
  }, [messages, isLoading, lastMessage?.role]);

  // 保存消息到存储
  const prevMessagesRef = useRef(messages);
  useEffect(() => {
    if (activeSessionId && messages.length > 0 && messages !== prevMessagesRef.current) {
      prevMessagesRef.current = messages;
      saveUiMessages(activeSessionId, messages).catch((err) =>
        console.error('[useChatState] Failed to save messages:', err)
      );
    }
  }, [activeSessionId, messages]);

  // 发送消息（带标题生成）
  const sendMessage = useCallback(
    async (payload: SendMessagePayload) => {
      const isFirstMessage = messages.length === 0;

      // 发送消息，传递 text 和 metadata
      await sdkSendMessage({
        text: payload.text,
        metadata: payload.metadata,
      });

      // 第一条消息时异步生成标题
      if (isFirstMessage && activeSessionId) {
        generateSessionTitle(activeSessionId, payload.text, selectedModelId ?? undefined)
          .then(refreshSessions)
          .catch((err) => console.error('[useChatState] Failed to generate title:', err));
      }
    },
    [messages.length, activeSessionId, selectedModelId, sdkSendMessage, refreshSessions]
  );

  return {
    messages,
    displayMessages,
    status,
    error: error ?? null,
    isLoading,
    isStreaming,
    sendMessage,
    stop,
    setMessages,
    addToolApprovalResponse,
  };
}

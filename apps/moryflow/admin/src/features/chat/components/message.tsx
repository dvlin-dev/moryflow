/**
 * [PROPS]: MessageProps - 单条 UIMessage 渲染参数
 * [EMITS]: None
 * [POS]: Admin chat 的统一消息渲染入口（parts 驱动）
 * [UPDATE]: 2026-03-02 - 从字符串气泡升级为 UIMessage.parts 渲染，复用共享 Tool/Reasoning 组件
 */

import { isDynamicToolUIPart, isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';
import {
  shouldRenderAssistantMessage,
  shouldShowAssistantLoadingPlaceholder,
} from '@moryflow/agents-runtime/ui-message/assistant-placeholder-policy';
import type { ChatMessage, ChatStatus } from '../store';
import {
  Message as ChatMessageNode,
  MessageContent,
  MessageResponse,
  cleanFileRefMarker,
  splitMessageParts,
} from '@moryflow/ui/ai/message';
import { Loader } from '@moryflow/ui/ai/loader';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@moryflow/ui/ai/reasoning';
import { MessageTool } from './message-tool';
import { useTranslation } from '@/lib/i18n';

type MessageProps = {
  message: ChatMessage;
  status: ChatStatus;
  isLastMessage: boolean;
};

export function Message({ message, status, isLastMessage }: MessageProps) {
  const { t } = useTranslation('chat');
  const shouldRenderAssistant = shouldRenderAssistantMessage({
    message,
    status,
    isLastMessage,
  });
  const showAssistantLoadingPlaceholder = shouldShowAssistantLoadingPlaceholder({
    message,
    status,
    isLastMessage,
  });

  if (!shouldRenderAssistant) {
    return null;
  }

  const { orderedParts, messageText } = splitMessageParts(message.parts);
  const displayText = message.role === 'user' ? cleanFileRefMarker(messageText) : messageText;

  const renderMessageBody = () => {
    if (message.role === 'user') {
      return <MessageResponse>{displayText}</MessageResponse>;
    }

    if (orderedParts.length === 0) {
      if (showAssistantLoadingPlaceholder) {
        return <ThinkingContent text={t('thinking')} />;
      }
      return null;
    }

    return orderedParts.map((part, index) => {
      if (isTextUIPart(part)) {
        return (
          <MessageResponse key={`${message.id}-text-${index}`}>{part.text ?? ''}</MessageResponse>
        );
      }

      if (isReasoningUIPart(part)) {
        return (
          <Reasoning
            key={`${message.id}-reasoning-${index}`}
            isStreaming={part.state === 'streaming'}
            defaultOpen={part.state === 'streaming'}
            className="mt-3"
          >
            <ReasoningTrigger className="py-0.5 text-sm" />
            <ReasoningContent className="mt-2">{part.text ?? ''}</ReasoningContent>
          </Reasoning>
        );
      }

      if (isToolUIPart(part) || isDynamicToolUIPart(part)) {
        return <MessageTool key={`${message.id}-tool-${index}`} part={part} />;
      }

      return null;
    });
  };

  return (
    <ChatMessageNode from={message.role} data-message-id={message.id}>
      <MessageContent>{renderMessageBody()}</MessageContent>
    </ChatMessageNode>
  );
}

const ThinkingContent = ({ text }: { text: string }) => (
  <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
    <Loader className="text-muted-foreground" size={14} />
    <span className="sr-only">{text}</span>
  </span>
);

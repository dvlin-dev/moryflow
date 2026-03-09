/**
 * [PROPS]: MessageProps - 单条 UIMessage 渲染参数
 * [EMITS]: None
 * [POS]: Admin chat 的统一消息渲染入口（parts 驱动）
 */

import { isReasoningUIPart, isTextUIPart, isToolUIPart, type DynamicToolUIPart } from 'ai';
import type { ToolUIPart } from 'ai';
import {
  shouldRenderAssistantMessage,
  shouldShowAssistantLoadingPlaceholder,
} from '@moryflow/agents-runtime/ui-message/assistant-placeholder-policy';
import type { ChatMessage, ChatStatus } from '../store';
import {
  Message as ChatMessageNode,
  MessageContent,
  MessageResponse,
  buildVisibleOrderedPartEntries,
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
  hiddenOrderedPartIndexes?: ReadonlySet<number>;
};

type SupportedMessagePart = Parameters<typeof isToolUIPart>[0];

const isDynamicToolPart = (part: SupportedMessagePart): part is DynamicToolUIPart => {
  if (!part || typeof part !== 'object') {
    return false;
  }
  return (part as { type?: string }).type === 'dynamic-tool';
};

const isRenderableToolPart = (
  part: SupportedMessagePart
): part is ToolUIPart | DynamicToolUIPart => {
  return isToolUIPart(part) || isDynamicToolPart(part);
};

export function Message({
  message,
  status,
  isLastMessage,
  hiddenOrderedPartIndexes,
}: MessageProps) {
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
  const visibleOrderedPartEntries = buildVisibleOrderedPartEntries(
    orderedParts,
    hiddenOrderedPartIndexes
  );
  const displayText = message.role === 'user' ? cleanFileRefMarker(messageText) : messageText;

  const renderMessageBody = () => {
    if (message.role === 'user') {
      return <MessageResponse>{displayText}</MessageResponse>;
    }

    if (visibleOrderedPartEntries.length === 0) {
      if (showAssistantLoadingPlaceholder) {
        return <ThinkingContent text={t('thinking')} />;
      }
      return null;
    }

    return visibleOrderedPartEntries.map(({ orderedPart: part, orderedPartIndex }) => {
      if (isTextUIPart(part)) {
        return (
          <MessageResponse key={`${message.id}-text-${orderedPartIndex}`}>
            {part.text ?? ''}
          </MessageResponse>
        );
      }

      if (isReasoningUIPart(part)) {
        return (
          <Reasoning
            key={`${message.id}-reasoning-${orderedPartIndex}`}
            isStreaming={part.state === 'streaming'}
            defaultOpen={part.state === 'streaming'}
            className="mt-3"
          >
            <ReasoningTrigger
              className="py-0.5 text-sm"
              thinkingLabel={t('thinkingProcess')}
              thoughtLabel={t('thinkingProcess')}
              viewportAnchorId={`reasoning:${message.id}:${orderedPartIndex}`}
            />
            <ReasoningContent className="mt-2">{part.text ?? ''}</ReasoningContent>
          </Reasoning>
        );
      }

      if (isRenderableToolPart(part)) {
        return (
          <MessageTool
            key={`${message.id}-tool-${orderedPartIndex}`}
            part={part}
            messageId={message.id}
            partIndex={orderedPartIndex}
          />
        );
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

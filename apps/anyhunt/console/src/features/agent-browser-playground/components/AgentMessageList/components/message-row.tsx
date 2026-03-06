/**
 * [PROPS]: MessageRowProps - 单条消息渲染参数
 * [EMITS]: None
 * [POS]: AgentMessageList 的单条消息展示
 * [UPDATE]: 2026-02-03 - thinking 占位改为 loading icon（由空消息触发）
 * [UPDATE]: 2026-02-08 - parts 解析复用 `@moryflow/ui/ai/message`（split/clean），避免多端重复实现导致语义漂移
 * [UPDATE]: 2026-02-10 - Streamdown v2.2 流式逐词动画：仅对最后一条 assistant 的最后一个 text part 启用
 * [UPDATE]: 2026-02-10 - STREAMDOWN_ANIM 标记：全局检索点（动画 gating + 最后 text part 定位）
 * [UPDATE]: 2026-03-02 - Reasoning 改为文字流样式（去容器化），与 Moryflow 消息渲染一致
 * [UPDATE]: 2026-03-06 - Reasoning/Tool 触发器透传稳定 `viewportAnchorId/messageId/partIndex`，与 shared viewport 锚点保持语义对齐
 * [UPDATE]: 2026-03-06 - 支持 hiddenOrderedPartIndexes，轮次折叠后通过 shared visible orderedPartEntries 保留原始索引，仅渲染可见 orderedParts
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Message,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
  MessageMetaAttachments,
  MessageResponse,
  buildVisibleOrderedPartEntries,
  cleanFileRefMarker,
  findLastTextOrderedPartIndex,
  splitMessageParts,
} from '@moryflow/ui/ai/message';
import { Loader } from '@moryflow/ui/ai/loader';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@moryflow/ui/ai/reasoning';
import { STREAMDOWN_ANIM_STREAMING_OPTIONS } from '@moryflow/ui/ai/streamdown-anim';
import {
  shouldRenderAssistantMessage,
  shouldShowAssistantLoadingPlaceholder,
} from '@moryflow/agents-runtime/ui-message/assistant-placeholder-policy';
import { isReasoningUIPart, isTextUIPart, isToolUIPart, type ChatStatus, type UIMessage } from 'ai';
import type { ChatMessageMeta, ChatMessageMetadata } from '@moryflow/types';

import { MessageTool } from './message-tool';

type MessageRowProps = {
  message: UIMessage;
  status: ChatStatus;
  isLastMessage: boolean;
  streamdownAnimated?: boolean;
  streamdownIsAnimating?: boolean;
  hiddenOrderedPartIndexes?: ReadonlySet<number>;
};

const getMessageMeta = (message: UIMessage): ChatMessageMeta => {
  const meta = message.metadata as ChatMessageMetadata | undefined;
  return meta?.chat ?? {};
};

export function MessageRow({
  message,
  status,
  isLastMessage,
  streamdownAnimated,
  streamdownIsAnimating,
  hiddenOrderedPartIndexes,
}: MessageRowProps) {
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

  const { fileParts, orderedParts, messageText } = splitMessageParts(message.parts);
  const visibleOrderedPartEntries = buildVisibleOrderedPartEntries(
    orderedParts,
    hiddenOrderedPartIndexes
  );
  const { attachments: chatAttachments = [] } = getMessageMeta(message);

  const displayText = message.role === 'user' ? cleanFileRefMarker(messageText) : messageText;
  const shouldShowMetaAttachments = message.role === 'user' && chatAttachments.length > 0;
  const lastTextPartIndex = streamdownAnimated
    ? findLastTextOrderedPartIndex(visibleOrderedPartEntries)
    : -1;

  const renderMessageBody = () => {
    if (message.role === 'user') {
      return <MessageResponse>{displayText}</MessageResponse>;
    }
    if (visibleOrderedPartEntries.length === 0) {
      if (showAssistantLoadingPlaceholder) {
        return <ThinkingContent />;
      }
      return null;
    }
    return visibleOrderedPartEntries.map(({ orderedPart: part, orderedPartIndex }) => {
      if (isTextUIPart(part)) {
        // STREAMDOWN_ANIM: 只对最后一条 assistant 的最后一个 text part 传 animated/isAnimating。
        const shouldAnimate = streamdownAnimated && orderedPartIndex === lastTextPartIndex;
        return (
          <MessageResponse
            key={`${message.id}-text-${orderedPartIndex}`}
            {...(shouldAnimate
              ? {
                  animated: STREAMDOWN_ANIM_STREAMING_OPTIONS,
                  isAnimating: Boolean(streamdownIsAnimating),
                }
              : {})}
          >
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
              viewportAnchorId={`reasoning:${message.id}:${orderedPartIndex}`}
            />
            <ReasoningContent className="mt-2">{part.text ?? ''}</ReasoningContent>
          </Reasoning>
        );
      }
      if (isToolUIPart(part)) {
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
    <Message from={message.role} data-message-id={message.id}>
      <MessageContent>{renderMessageBody()}</MessageContent>
      {fileParts.length > 0 ? (
        <MessageAttachments>
          {fileParts.map((file, index) => (
            <MessageAttachment
              key={file.url ?? file.filename ?? `${message.id}-file-${index}`}
              data={file}
            />
          ))}
        </MessageAttachments>
      ) : null}
      {shouldShowMetaAttachments ? <MessageMetaAttachments attachments={chatAttachments} /> : null}
    </Message>
  );
}

const ThinkingContent = () => (
  <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
    <Loader className="text-muted-foreground" size={14} />
    <span className="sr-only">Thinking</span>
  </span>
);

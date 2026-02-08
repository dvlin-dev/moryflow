/**
 * [PROPS]: MessageRowProps - 单条消息渲染参数
 * [EMITS]: None
 * [POS]: AgentMessageList 的单条消息展示
 * [UPDATE]: 2026-02-03 - thinking 占位改为 loading icon（由空消息触发）
 * [UPDATE]: 2026-02-08 - parts 解析复用 `@anyhunt/ui/ai/message`（split/clean），避免多端重复实现导致语义漂移
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
  cleanFileRefMarker,
  splitMessageParts,
  type MessageAttachmentLabels,
} from '@anyhunt/ui/ai/message';
import { Loader } from '@anyhunt/ui/ai/loader';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@anyhunt/ui/ai/reasoning';
import { isReasoningUIPart, isTextUIPart, isToolUIPart, type UIMessage } from 'ai';
import type { ChatMessageMeta, ChatMessageMetadata } from '@anyhunt/types';

import { MessageTool } from './message-tool';

const ATTACHMENT_LABELS: MessageAttachmentLabels = {
  image: 'Image',
  attachment: 'Attachment',
  remove: 'Remove',
  contextBadge: 'Context',
  contextExpand: 'View context',
  contextCollapse: 'Hide context',
  contextTruncated: 'Content truncated',
};

type MessageRowProps = {
  message: UIMessage;
};

const getMessageMeta = (message: UIMessage): ChatMessageMeta => {
  const meta = message.metadata as ChatMessageMetadata | undefined;
  return meta?.chat ?? {};
};

export function MessageRow({ message }: MessageRowProps) {
  const { fileParts, orderedParts, messageText } = splitMessageParts(message.parts);
  const { attachments: chatAttachments = [] } = getMessageMeta(message);

  const displayText = message.role === 'user' ? cleanFileRefMarker(messageText) : messageText;
  const shouldShowMetaAttachments = message.role === 'user' && chatAttachments.length > 0;

  const renderMessageBody = () => {
    if (message.role === 'user') {
      return <MessageResponse>{displayText}</MessageResponse>;
    }
    if (orderedParts.length === 0) {
      return <ThinkingContent />;
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
            className="mt-3 rounded-md border border-border/50 bg-muted/20 p-3"
          >
            <ReasoningTrigger />
            <ReasoningContent>{part.text ?? ''}</ReasoningContent>
          </Reasoning>
        );
      }
      if (isToolUIPart(part)) {
        return <MessageTool key={`${message.id}-tool-${index}`} part={part} />;
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
              labels={ATTACHMENT_LABELS}
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

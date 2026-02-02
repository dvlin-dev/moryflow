/**
 * [PROPS]: MessageRowProps - 单条消息渲染参数
 * [EMITS]: None
 * [POS]: AgentMessageList 的单条消息展示
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
  type MessageAttachmentLabels,
} from '@anyhunt/ui/ai/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@anyhunt/ui/ai/reasoning';
import { Shimmer } from '@anyhunt/ui/ai/shimmer';
import {
  isFileUIPart,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type FileUIPart,
  type UIMessage,
} from 'ai';
import type { ChatMessageMeta, ChatMessageMetadata } from '@anyhunt/types';

import { MessageTool } from './message-tool';

/** 移除消息文本末尾的文件引用标记 */
const FILE_REF_REGEX = /\n\n\[Referenced files: [^\]]+\]$/;

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

const cleanFileRefMarker = (text: string): string => text.replace(FILE_REF_REGEX, '');

const getMessageMeta = (message: UIMessage): ChatMessageMeta => {
  const meta = message.metadata as ChatMessageMetadata | undefined;
  return meta?.chat ?? {};
};

type SplitMessageParts = {
  fileParts: FileUIPart[];
  orderedParts: UIMessage['parts'][number][];
  messageText: string;
};

const splitMessageParts = (parts: UIMessage['parts'] | undefined): SplitMessageParts => {
  const fileParts: FileUIPart[] = [];
  const orderedParts: UIMessage['parts'][number][] = [];
  const textParts: string[] = [];

  if (!parts || parts.length === 0) {
    return { fileParts, orderedParts, messageText: '' };
  }

  for (const part of parts) {
    if (isFileUIPart(part)) {
      fileParts.push(part);
      continue;
    }
    orderedParts.push(part);
    if (isTextUIPart(part)) {
      textParts.push(part.text ?? '');
    }
  }

  return { fileParts, orderedParts, messageText: textParts.join('\n') };
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
  <Shimmer className="text-sm font-medium text-muted-foreground" as="span" duration={3} spread={3}>
    Thinking...
  </Shimmer>
);

/**
 * [PROPS]: AgentMessageListProps
 * [EMITS]: None
 * [POS]: Agent Playground 对话消息渲染（复用共享消息列表 UI）
 */

import type { CSSProperties } from 'react';
import { Alert, AlertDescription } from '@anyhunt/ui';
import { MessageList } from '@anyhunt/ui/ai/message-list';
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
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolOutputLabels,
  type ToolState,
  type ToolStatusLabels,
} from '@anyhunt/ui/ai/tool';
import {
  isFileUIPart,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type ChatStatus,
  type UIMessage,
} from 'ai';
import type { ChatMessageMeta, ChatMessageMetadata } from '@anyhunt/types';

/** 移除消息文本末尾的文件引用标记 */
const FILE_REF_REGEX = /\n\n\[Referenced files: [^\]]+\]$/;

const cleanFileRefMarker = (text: string): string => text.replace(FILE_REF_REGEX, '');

const getMessageMeta = (message: UIMessage): ChatMessageMeta => {
  const meta = message.metadata as ChatMessageMetadata | undefined;
  return meta?.chat ?? {};
};

const TOOL_STATUS_LABELS: ToolStatusLabels = {
  'input-streaming': 'Preparing',
  'input-available': 'Running',
  'approval-requested': 'Awaiting approval',
  'approval-responded': 'Approved',
  'output-available': 'Completed',
  'output-error': 'Error',
  'output-denied': 'Skipped',
};

const TOOL_OUTPUT_LABELS: ToolOutputLabels = {
  result: 'Result',
  error: 'Error',
  command: 'Command',
  cwd: 'cwd',
  exit: 'Exit',
  duration: 'Duration',
  stdout: 'stdout',
  stderr: 'stderr',
  targetFile: 'Target file',
  contentTooLong: 'Content too long',
  applyToFile: 'Apply to file',
  applying: 'Applying...',
  applied: 'Applied',
  noTasks: 'No tasks available',
  tasksCompleted: (completed: number, total: number) => `Tasks completed: ${completed}/${total}`,
};

const ATTACHMENT_LABELS: MessageAttachmentLabels = {
  image: 'Image',
  attachment: 'Attachment',
  remove: 'Remove',
  contextBadge: 'Context',
  contextExpand: 'View context',
  contextCollapse: 'Hide context',
  contextTruncated: 'Content truncated',
};

export interface AgentMessageListProps {
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error | null;
}

export function AgentMessageList({ messages, status, error }: AgentMessageListProps) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <MessageList
        className="flex-1"
        messages={messages}
        status={status}
        emptyState={{
          title: 'Waiting for you',
          description: 'Send a prompt to start a run.',
        }}
        renderMessage={({ message, isPlaceholder, minHeight, registerRef }) => {
          const parts = message.parts ?? [];
          const fileParts = parts.filter(isFileUIPart);
          const orderedParts = parts.filter((part) => !isFileUIPart(part));
          const { attachments: chatAttachments = [] } = getMessageMeta(message);

          const textParts = orderedParts.filter(isTextUIPart);
          const rawText = textParts.map((part) => part.text).join('\n');
          const messageText = message.role === 'user' ? cleanFileRefMarker(rawText) : rawText;

          const style = minHeight ? ({ minHeight } as CSSProperties) : undefined;

          return (
            <Message
              key={message.id}
              ref={registerRef}
              from={message.role}
              data-message-id={message.id}
              data-placeholder={isPlaceholder ? 'true' : undefined}
              style={style}
            >
              <MessageContent>
                {message.role === 'user' ? (
                  <MessageResponse>{messageText}</MessageResponse>
                ) : orderedParts.length === 0 ? (
                  <ThinkingContent />
                ) : (
                  orderedParts.map((part, index) => {
                    if (isTextUIPart(part)) {
                      return (
                        <MessageResponse key={`${message.id}-text-${index}`}>
                          {part.text ?? ''}
                        </MessageResponse>
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
                      const hasDetails =
                        part.input !== undefined || part.output !== undefined || !!part.errorText;

                      return (
                        <Tool
                          key={`${message.id}-tool-${index}`}
                          defaultOpen={false}
                          disabled={!hasDetails}
                        >
                          <ToolHeader
                            type={part.type}
                            state={part.state as ToolState}
                            input={part.input as Record<string, unknown> | undefined}
                            statusLabels={TOOL_STATUS_LABELS}
                          />
                          {hasDetails && (
                            <ToolContent>
                              {part.input !== undefined && (
                                <ToolInput input={part.input} label="Parameters" />
                              )}
                              {(part.output !== undefined || part.errorText) && (
                                <ToolOutput
                                  output={part.output}
                                  errorText={part.errorText}
                                  labels={TOOL_OUTPUT_LABELS}
                                />
                              )}
                            </ToolContent>
                          )}
                        </Tool>
                      );
                    }
                    return null;
                  })
                )}
              </MessageContent>
              {fileParts.length > 0 && (
                <MessageAttachments>
                  {fileParts.map((file, index) => (
                    <MessageAttachment
                      key={file.url ?? file.filename ?? `${message.id}-file-${index}`}
                      data={file}
                      labels={ATTACHMENT_LABELS}
                    />
                  ))}
                </MessageAttachments>
              )}
              {message.role === 'user' && chatAttachments.length > 0 && (
                <MessageMetaAttachments attachments={chatAttachments} />
              )}
            </Message>
          );
        }}
      />
      {error && (
        <div className="px-4 pb-4">
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}

const ThinkingContent = () => (
  <Shimmer className="text-sm font-medium text-muted-foreground" as="span" duration={3} spread={3}>
    Thinking...
  </Shimmer>
);

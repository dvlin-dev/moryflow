/**
 * [PROPS]: AgentMessageListProps
 * [EMITS]: None
 * [POS]: Agent Playground 对话消息渲染（复用共享消息列表 UI）
 * [UPDATE]: 2026-02-02 - 追加 loading 占位，发送后用户消息顶到顶部
 * [UPDATE]: 2026-02-02 - loading 图标与 AI 文案起始对齐
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Alert, AlertDescription } from '@anyhunt/ui';
import { MessageList } from '@anyhunt/ui/ai/message-list';
import { Message, MessageContent } from '@anyhunt/ui/ai/message';
import type { ChatStatus, UIMessage } from 'ai';
import { Loader2 } from 'lucide-react';

import { MessageRow } from './components/message-row';

export interface AgentMessageListProps {
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error | null;
}

export function AgentMessageList({ messages, status, error }: AgentMessageListProps) {
  const loadingIndicator = (
    <Message from="assistant">
      <MessageContent className="text-muted-foreground">
        <span className="inline-flex items-center">
          <Loader2 className="size-4 animate-spin" />
        </span>
      </MessageContent>
    </Message>
  );

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
        loading={loadingIndicator}
        renderMessage={({ message }) => <MessageRow message={message} />}
      />
      {error ? (
        <div className="px-4 pb-4">
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </div>
      ) : null}
    </div>
  );
}

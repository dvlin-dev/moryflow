/**
 * [PROPS]: AgentMessageListProps
 * [EMITS]: None
 * [POS]: Agent Playground 对话消息渲染（复用共享消息列表 UI）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Alert, AlertDescription } from '@anyhunt/ui';
import { MessageList } from '@anyhunt/ui/ai/message-list';
import type { ChatStatus, UIMessage } from 'ai';

import { MessageRow } from './components/message-row';

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

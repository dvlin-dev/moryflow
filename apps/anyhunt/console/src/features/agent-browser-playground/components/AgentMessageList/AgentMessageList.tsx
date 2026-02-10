/**
 * [PROPS]: AgentMessageListProps
 * [EMITS]: None
 * [POS]: Agent Playground 对话消息渲染（复用共享消息列表 UI）
 * [UPDATE]: 2026-02-03 - loading 由占位消息渲染，MessageList 不再额外接入
 * [UPDATE]: 2026-02-10 - Streamdown v2.2 流式逐词动画：仅对最后一条 assistant 文本段启用
 * [UPDATE]: 2026-02-10 - STREAMDOWN_ANIM 标记：全局检索点（上层动画 gating）
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
  const isRunning = status === 'submitted' || status === 'streaming';

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
        renderMessage={({ message, index }) => {
          const isLastMessage = index === messages.length - 1;
          // STREAMDOWN_ANIM: 上层只把“是否最后一条 assistant + 是否 streaming”透传给 MessageRow。
          const streamdownAnimated = message.role === 'assistant' && isLastMessage;
          const streamdownIsAnimating = streamdownAnimated && isRunning;
          return (
            <MessageRow
              message={message}
              streamdownAnimated={streamdownAnimated}
              streamdownIsAnimating={streamdownIsAnimating}
            />
          );
        }}
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

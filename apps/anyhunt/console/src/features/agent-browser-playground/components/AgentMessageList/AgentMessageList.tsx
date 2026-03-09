/**
 * [PROPS]: AgentMessageListProps
 * [EMITS]: None
 * [POS]: Agent Playground 对话消息渲染（复用共享消息列表 UI）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@moryflow/ui';
import { AssistantRoundSummary } from '@moryflow/ui/ai/assistant-round-summary';
import { MessageList } from '@moryflow/ui/ai/message-list';
import {
  buildAssistantRoundRenderItems,
  formatAssistantRoundDuration,
  resolveAssistantRoundPreferenceScopeKey,
} from '@moryflow/agents-runtime/ui-message/assistant-round-collapse';
import type { ChatStatus, UIMessage } from 'ai';

import { MessageRow } from './components/message-row';

const EMPTY_MANUAL_ROUND_OPEN_BY_ID: Record<string, boolean> = {};

export interface AgentMessageListProps {
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error | null;
}

export function AgentMessageList({ messages, status, error }: AgentMessageListProps) {
  const isRunning = status === 'submitted' || status === 'streaming';
  const [manualRoundPreferenceState, setManualRoundPreferenceState] = useState<{
    scopeKey: string;
    values: Record<string, boolean>;
  }>({
    scopeKey: '__empty__',
    values: {},
  });
  const roundPreferenceScopeKey = useMemo(
    () => resolveAssistantRoundPreferenceScopeKey({ messages }),
    [messages]
  );
  const manualRoundOpenById = useMemo(
    () =>
      manualRoundPreferenceState.scopeKey === roundPreferenceScopeKey
        ? manualRoundPreferenceState.values
        : EMPTY_MANUAL_ROUND_OPEN_BY_ID,
    [manualRoundPreferenceState, roundPreferenceScopeKey]
  );
  const roundRender = useMemo(
    () =>
      buildAssistantRoundRenderItems({
        messages,
        status,
        manualOpenPreferenceByRoundId: manualRoundOpenById,
      }),
    [manualRoundOpenById, messages, status]
  );
  const summaryByMessageIndex = useMemo(() => {
    const map = new Map<number, (typeof roundRender.items)[number]>();
    for (const item of roundRender.items) {
      if (item.type !== 'summary') {
        continue;
      }
      map.set(item.round.summaryAnchorMessageIndex, item);
    }
    return map;
  }, [roundRender]);

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
          const summary = summaryByMessageIndex.get(index);
          const hiddenByRound = roundRender.hiddenAssistantIndexSet.has(index);
          const hiddenOrderedPartIndexes =
            roundRender.hiddenOrderedPartIndexesByMessageIndex.get(index);
          const isLastMessage = index === messages.length - 1;
          // STREAMDOWN_ANIM: 上层只把“是否最后一条 assistant + 是否 streaming”透传给 MessageRow。
          const streamdownAnimated = message.role === 'assistant' && isLastMessage;
          const streamdownIsAnimating = streamdownAnimated && isRunning;
          const messageNode = hiddenByRound ? null : (
            <MessageRow
              message={message}
              status={status}
              isLastMessage={isLastMessage}
              streamdownAnimated={streamdownAnimated}
              streamdownIsAnimating={streamdownIsAnimating}
              hiddenOrderedPartIndexes={hiddenOrderedPartIndexes}
            />
          );

          if (!summary || summary.type !== 'summary') {
            return messageNode;
          }

          const summaryLabel =
            typeof summary.durationMs === 'number'
              ? `Processed ${formatAssistantRoundDuration(summary.durationMs)}`
              : 'Processed';

          return (
            <div className="space-y-2">
              <AssistantRoundSummary
                label={summaryLabel}
                open={summary.open}
                viewportAnchorId={`round:${summary.roundId}`}
                aria-label={summary.open ? 'Collapse process messages' : 'Expand process messages'}
                onClick={() => {
                  setManualRoundPreferenceState((prev) => {
                    const currentValues =
                      prev.scopeKey === roundPreferenceScopeKey ? prev.values : {};
                    return {
                      scopeKey: roundPreferenceScopeKey,
                      values: {
                        ...currentValues,
                        [summary.roundId]: !summary.open,
                      },
                    };
                  });
                }}
              />
              {messageNode}
            </div>
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

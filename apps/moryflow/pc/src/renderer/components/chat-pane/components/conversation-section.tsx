/**
 * [PROPS]: Props - 对话列表渲染参数
 * [EMITS]: None
 * [POS]: Chat Pane 消息列表与错误提示渲染
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Alert, AlertDescription } from '@moryflow/ui/components/alert';
import { AnimatedCollapse } from '@moryflow/ui/animate/primitives/base/animated-collapse';
import { AssistantRoundSummary } from '@moryflow/ui/ai/assistant-round-summary';
import { MessageList } from '@moryflow/ui/ai/message-list';
import {
  buildAssistantRoundRenderItems,
  formatAssistantRoundDuration,
  resolveAssistantRoundPreferenceScopeKey,
} from '@moryflow/agents-runtime/ui-message/assistant-round-collapse';
import { useTranslation } from '@/lib/i18n';
import { ChatMessage } from './message';
import type { ChatStatus, UIMessage } from 'ai';
import type { MessageActionHandlers } from './message/const';
import { resolveLastVisibleAssistantIndex } from './message/message-loading';

const EMPTY_MANUAL_ROUND_OPEN_BY_ID: Record<string, boolean> = {};

type Props = {
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error | null;
  messageActions?: MessageActionHandlers;
  onToolApproval?: (input: { approvalId: string; action: 'once' | 'allow_type' | 'deny' }) => void;
  footer?: ReactNode;
  threadId?: string | null;
};

/**
 * 对话内容区域渲染，包含空态、消息列表和错误提示。
 */
export const ConversationSection = ({
  messages,
  status,
  error,
  messageActions,
  onToolApproval,
  footer,
  threadId,
}: Props) => {
  const { t } = useTranslation('chat');
  const [manualRoundPreferenceState, setManualRoundPreferenceState] = useState<{
    scopeKey: string;
    values: Record<string, boolean>;
  }>({
    scopeKey: '__empty__',
    values: {},
  });
  const roundPreferenceScopeKey = useMemo(
    () => resolveAssistantRoundPreferenceScopeKey({ messages, threadId }),
    [messages, threadId]
  );
  const manualRoundOpenById = useMemo(
    () =>
      manualRoundPreferenceState.scopeKey === roundPreferenceScopeKey
        ? manualRoundPreferenceState.values
        : EMPTY_MANUAL_ROUND_OPEN_BY_ID,
    [manualRoundPreferenceState, roundPreferenceScopeKey]
  );

  const lastAssistantIndex = useMemo(
    () => resolveLastVisibleAssistantIndex({ messages, status }),
    [messages, status]
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MessageList
        className="min-h-0 flex-1"
        messages={messages}
        status={status}
        threadId={threadId ?? undefined}
        emptyState={{
          title: t('waitingForYou'),
          description: t('startChatPrompt'),
        }}
        footer={footer}
        renderMessage={({ message, index }) => {
          const summary = summaryByMessageIndex.get(index);
          const hiddenByRound = roundRender.hiddenAssistantIndexSet.has(index);
          const hiddenOrderedPartIndexes =
            roundRender.hiddenOrderedPartIndexesByMessageIndex.get(index);
          const isLastAssistant = index === lastAssistantIndex;
          const isLastMessage = index === messages.length - 1;
          if (!summary || summary.type !== 'summary') {
            return hiddenByRound ? null : (
              <ChatMessage
                message={message}
                messageIndex={index}
                status={status}
                isLastAssistant={isLastAssistant}
                isLastMessage={isLastMessage}
                actions={messageActions}
                onToolApproval={onToolApproval}
                hiddenOrderedPartIndexes={hiddenOrderedPartIndexes}
              />
            );
          }

          const durationText =
            typeof summary.durationMs === 'number'
              ? formatAssistantRoundDuration(summary.durationMs)
              : null;
          const summaryLabel = durationText
            ? t('assistantRoundProcessedWithDuration', { duration: durationText })
            : t('assistantRoundProcessed');

          return (
            <div className="space-y-2">
              <AssistantRoundSummary
                label={summaryLabel}
                open={summary.open}
                viewportAnchorId={`round:${summary.roundId}`}
                aria-label={summary.open ? t('assistantRoundCollapse') : t('assistantRoundExpand')}
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
              <AnimatedCollapse open={!hiddenByRound}>
                <ChatMessage
                  message={message}
                  messageIndex={index}
                  status={status}
                  isLastAssistant={isLastAssistant}
                  isLastMessage={isLastMessage}
                  actions={messageActions}
                  onToolApproval={onToolApproval}
                  hiddenOrderedPartIndexes={hiddenOrderedPartIndexes}
                />
              </AnimatedCollapse>
            </div>
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
};

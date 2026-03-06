/**
 * 对话区组件
 * 包含消息列表和空态
 * [UPDATE]: 2026-03-06 - 接入 assistant round 折叠：轮次结束仅保留结论消息并提供摘要触发器
 */
import { useRef, useEffect, useMemo, useState } from 'react';
import { AssistantRoundSummary } from '@moryflow/ui/ai/assistant-round-summary';
import {
  buildAssistantRoundRenderItems,
  formatAssistantRoundDuration,
  resolveAssistantRoundPreferenceScopeKey,
} from '@moryflow/agents-runtime/ui-message/assistant-round-collapse';
import { Message } from './message';
import { MessageSquare } from 'lucide-react';
import { useChatSessionStore } from '../store';
import { useTranslation } from '@/lib/i18n';

const EMPTY_MANUAL_ROUND_OPEN_BY_ID: Record<string, boolean> = {};

function EmptyConversationState() {
  const { t } = useTranslation('chat');

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="rounded-full bg-muted p-3">
        <MessageSquare className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium text-sm">{t('waitingForYou')}</h3>
        <p className="text-muted-foreground text-sm">{t('startChatPrompt')}</p>
      </div>
    </div>
  );
}

export function ConversationSection() {
  const messages = useChatSessionStore((state) => state.messages);
  const status = useChatSessionStore((state) => state.status);
  const [manualRoundPreferenceState, setManualRoundPreferenceState] = useState<{
    scopeKey: string;
    values: Record<string, boolean>;
  }>({
    scopeKey: '__empty__',
    values: {},
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('chat');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      map.set(item.round.firstAssistantIndex, item);
    }
    return map;
  }, [roundRender]);

  if (messages.length === 0) {
    return <EmptyConversationState />;
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-col gap-3">
        {messages.map((message, index) => {
          const summary = summaryByMessageIndex.get(index);
          const hiddenByRound = roundRender.hiddenAssistantIndexSet.has(index);
          const messageNode = hiddenByRound ? null : (
            <Message
              message={message}
              status={status}
              isLastMessage={index === messages.length - 1}
            />
          );

          if (!summary || summary.type !== 'summary') {
            if (messageNode == null) {
              return null;
            }
            return <div key={message.id}>{messageNode}</div>;
          }

          const durationText =
            typeof summary.durationMs === 'number'
              ? formatAssistantRoundDuration(summary.durationMs)
              : null;
          const summaryLabel = durationText
            ? t('assistantRoundProcessedWithDuration', { duration: durationText })
            : t('assistantRoundProcessed');

          return (
            <div key={message.id} className="space-y-2">
              <AssistantRoundSummary
                label={summaryLabel}
                open={summary.open}
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
              {messageNode}
            </div>
          );
        })}
      </div>
    </div>
  );
}

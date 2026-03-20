import type { UIMessage } from 'ai';
import type { AgentChatRequestOptions, TokenUsage } from '../../../shared/ipc.js';
import { chatSessionStore } from '../../chat-session-store/index.js';
import { annotateLatestAssistantRoundMetadata } from '@moryflow/agents-runtime';
import { broadcastMessageEvent, broadcastSessionEvent } from '../services/broadcast/event-bus.js';
import { sanitizePersistedUiMessages } from '../messages/sanitizePersistedUiMessages.js';
import { createRuntimeTaskStateService } from '../../agent-runtime/task-state-runtime.js';

export const persistChatRound = async (input: {
  chatId: string;
  messages: UIMessage[];
  preferredModelId?: string;
  thinking?: AgentChatRequestOptions['thinking'];
  thinkingProfile?: AgentChatRequestOptions['thinkingProfile'];
  requestUsage: TokenUsage;
  roundStartedAt?: number;
}) => {
  const roundAnnotated = annotateLatestAssistantRoundMetadata(input.messages, {
    startedAt: input.roundStartedAt,
    finishedAt: Date.now(),
  });
  const sanitizedMessages = sanitizePersistedUiMessages(roundAnnotated.messages);
  const hasUsage = input.requestUsage.totalTokens > 0;
  const summary = chatSessionStore.updateSessionMeta(input.chatId, {
    uiMessages: sanitizedMessages,
    preferredModelId: input.preferredModelId,
    thinking: input.thinking,
    thinkingProfile: input.thinkingProfile,
    tokenUsage: hasUsage ? input.requestUsage : undefined,
  });
  broadcastSessionEvent({ type: 'updated', session: summary });
  broadcastMessageEvent({
    type: 'snapshot',
    sessionId: input.chatId,
    messages: sanitizedMessages,
    persisted: true,
  });

  if (
    summary.taskState &&
    summary.taskState.items.length > 0 &&
    summary.taskState.items.every((item) => item.status === 'done')
  ) {
    await createRuntimeTaskStateService().clearDone(input.chatId);
  }
};

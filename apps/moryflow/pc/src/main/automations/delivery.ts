import type { AgentInputItem } from '@openai/agents-core';
import type { AutomationJob } from '@moryflow/automations-core';
import type { OutboundEnvelope } from '@moryflow/channels-core';

type TelegramDeliveryBridge = {
  ensureReplyConversation: (input: {
    accountId: string;
    chatId: string;
    threadId?: string;
  }) => Promise<{
    peerKey: string;
    threadKey: string;
    conversationId: string;
  }>;
  sendEnvelope: (envelope: OutboundEnvelope) => Promise<void>;
};

const buildAssistantHistoryItem = (text: string): AgentInputItem =>
  ({
    type: 'message',
    role: 'assistant',
    content: [{ type: 'output_text', text }],
  }) as unknown as AgentInputItem;

const buildEnvelope = (
  target: Extract<AutomationJob['delivery'], { mode: 'push' }>['target'],
  outputText: string
): OutboundEnvelope => ({
  channel: target.channel,
  accountId: target.accountId,
  target: {
    chatId: target.chatId,
    ...(target.threadId ? { threadId: target.threadId } : {}),
  },
  message: { text: outputText },
});

const withRetry = async <T>(
  task: () => Promise<T>,
  maxAttempts = 2,
  delayMs = 1000
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
};

export const createAutomationDelivery = (input: {
  chatSessionStore: {
    appendHistory: (sessionId: string, items: AgentInputItem[]) => void;
  };
  syncConversationUiState: (conversationId: string) => Promise<void>;
  telegram: TelegramDeliveryBridge;
}) => {
  const buildLocalSyncErrorMessage = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return `Automation delivery succeeded, but local delivery state did not fully sync: ${message}`;
  };

  return {
    async deliver(
      job: AutomationJob,
      outputText: string
    ): Promise<{
      deliveryStatus: 'delivered' | 'not-delivered' | 'not-requested';
      localSyncError?: string;
    }> {
      if (job.delivery.mode !== 'push') {
        return { deliveryStatus: 'not-requested' };
      }
      const { target } = job.delivery;
      const output = outputText.trim();
      if (!output) {
        return { deliveryStatus: 'not-delivered' };
      }

      const conversation = await input.telegram.ensureReplyConversation({
        accountId: target.accountId,
        chatId: target.chatId,
        threadId: target.threadId,
      });

      await withRetry(() => input.telegram.sendEnvelope(buildEnvelope(target, output)));

      let localSyncError: string | undefined;
      try {
        input.chatSessionStore.appendHistory(conversation.conversationId, [
          buildAssistantHistoryItem(output),
        ]);
        await input.syncConversationUiState(conversation.conversationId);
      } catch (error) {
        localSyncError = buildLocalSyncErrorMessage(error);
      }

      return { deliveryStatus: 'delivered', localSyncError };
    },
  };
};

export type AutomationDelivery = ReturnType<typeof createAutomationDelivery>;

import type { AgentInputItem } from '@openai/agents-core';
import type { AutomationEndpoint, AutomationJob } from '@moryflow/automations-core';
import type { OutboundEnvelope } from '@moryflow/channels-core';
import type { AutomationStore } from './store.js';

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

const buildDeliveryEnvelope = (
  endpoint: AutomationEndpoint,
  outputText: string
): OutboundEnvelope => ({
  channel: 'telegram',
  accountId: endpoint.accountId,
  target: {
    chatId: endpoint.target.chatId,
    ...(endpoint.target.threadId ? { threadId: endpoint.target.threadId } : {}),
  },
  message: {
    text: outputText,
  },
});

const resolveFreshEndpoint = async (
  endpoint: AutomationEndpoint,
  telegram: TelegramDeliveryBridge
): Promise<AutomationEndpoint> => {
  const canonical = await telegram.ensureReplyConversation({
    accountId: endpoint.accountId,
    chatId: endpoint.target.chatId,
    threadId: endpoint.target.threadId,
  });

  return {
    ...endpoint,
    target: {
      ...endpoint.target,
      peerKey: canonical.peerKey,
      threadKey: canonical.threadKey,
    },
    replySessionId: canonical.conversationId,
  };
};

export const createAutomationDelivery = (input: {
  store: Pick<AutomationStore, 'getEndpoint' | 'saveEndpoint'>;
  chatSessionStore: {
    appendHistory: (sessionId: string, items: AgentInputItem[]) => void;
  };
  syncConversationUiState: (conversationId: string) => Promise<void>;
  telegram: TelegramDeliveryBridge;
  nowIso?: () => string;
}) => {
  const nowIso = input.nowIso ?? (() => new Date().toISOString());
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
      endpoint?: AutomationEndpoint;
      localSyncError?: string;
    }> {
      if (job.delivery.mode !== 'push') {
        return { deliveryStatus: 'not-requested' };
      }
      const savedEndpoint = input.store.getEndpoint(job.delivery.endpointId);
      if (!savedEndpoint) {
        throw new Error('Automation delivery endpoint not found.');
      }
      if (!savedEndpoint.verifiedAt) {
        throw new Error('Automation delivery endpoint is not verified.');
      }
      const output = outputText.trim();
      if (!output) {
        return {
          deliveryStatus: 'not-delivered',
          endpoint: savedEndpoint,
        };
      }

      const healedEndpoint = await resolveFreshEndpoint(savedEndpoint, input.telegram);
      const deliveredAt = nowIso();
      const nextEndpoint: AutomationEndpoint = {
        ...healedEndpoint,
        lastUsedAt: deliveredAt,
      };

      await input.telegram.sendEnvelope(buildDeliveryEnvelope(nextEndpoint, output));
      let persisted = nextEndpoint;
      let localSyncError: string | undefined;
      try {
        persisted = input.store.saveEndpoint(nextEndpoint);
        input.chatSessionStore.appendHistory(persisted.replySessionId, [
          buildAssistantHistoryItem(output),
        ]);
        await input.syncConversationUiState(persisted.replySessionId);
      } catch (error) {
        localSyncError = buildLocalSyncErrorMessage(error);
      }

      return {
        deliveryStatus: 'delivered',
        endpoint: persisted,
        localSyncError,
      };
    },
  };
};

export type AutomationDelivery = ReturnType<typeof createAutomationDelivery>;

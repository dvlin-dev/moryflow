import { randomUUID } from 'node:crypto';
import { automationEndpointSchema, type AutomationEndpoint } from '@moryflow/automations-core';
import type { OutboundEnvelope } from '@moryflow/channels-core';
import type { AutomationStore } from './store.js';

type BindTelegramEndpointInput = {
  channel: 'telegram';
  accountId: string;
  chatId: string;
  threadId?: string;
  label?: string;
};

type TelegramEndpointBridge = {
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

const VERIFICATION_MESSAGE = 'Moryflow automation notifications will be sent here.';

const buildDefaultLabel = (input: BindTelegramEndpointInput): string => {
  const trimmed = input.label?.trim();
  if (trimmed) {
    return trimmed;
  }
  if (input.threadId?.trim()) {
    return `Telegram ${input.chatId} #${input.threadId.trim()}`;
  }
  return `Telegram ${input.chatId}`;
};

const findExistingTelegramEndpoint = (
  endpoints: AutomationEndpoint[],
  input: {
    accountId: string;
    peerKey: string;
    threadKey: string;
  }
): AutomationEndpoint | null => {
  return (
    endpoints.find(
      (endpoint) =>
        endpoint.channel === 'telegram' &&
        endpoint.accountId === input.accountId &&
        endpoint.target.kind === 'telegram' &&
        endpoint.target.peerKey === input.peerKey &&
        endpoint.target.threadKey === input.threadKey
    ) ?? null
  );
};

const buildVerificationEnvelope = (endpoint: AutomationEndpoint): OutboundEnvelope => ({
  channel: 'telegram',
  accountId: endpoint.accountId,
  target: {
    chatId: endpoint.target.chatId,
    ...(endpoint.target.threadId ? { threadId: endpoint.target.threadId } : {}),
  },
  message: {
    text: VERIFICATION_MESSAGE,
  },
});

export const createAutomationEndpointsService = (input: {
  store: Pick<
    AutomationStore,
    'saveEndpoint' | 'listEndpoints' | 'removeEndpoint' | 'setDefaultEndpoint' | 'getEndpoint'
  > & {
    getDefaultEndpoint?: AutomationStore['getDefaultEndpoint'];
  };
  telegram: TelegramEndpointBridge;
  nowIso?: () => string;
  generateId?: () => string;
}) => {
  const nowIso = input.nowIso ?? (() => new Date().toISOString());
  const generateId = input.generateId ?? (() => randomUUID());

  const saveIfVerifiedAndNoDefault = (endpoint: AutomationEndpoint) => {
    if (!endpoint.verifiedAt || !input.store.getDefaultEndpoint) {
      return;
    }
    const currentDefault = input.store.getDefaultEndpoint();
    if (!currentDefault) {
      input.store.setDefaultEndpoint(endpoint.id);
    }
  };

  return {
    listEndpoints(): AutomationEndpoint[] {
      return input.store.listEndpoints();
    },
    getEndpoint(endpointId: string): AutomationEndpoint | null {
      return input.store.getEndpoint(endpointId);
    },
    async bindEndpoint(bindInput: BindTelegramEndpointInput): Promise<AutomationEndpoint> {
      const canonical = await input.telegram.ensureReplyConversation({
        accountId: bindInput.accountId,
        chatId: bindInput.chatId,
        threadId: bindInput.threadId,
      });

      const existing = findExistingTelegramEndpoint(input.store.listEndpoints(), {
        accountId: bindInput.accountId,
        peerKey: canonical.peerKey,
        threadKey: canonical.threadKey,
      });
      const baseTimestamp = nowIso();
      const endpoint = automationEndpointSchema.parse({
        id: existing?.id ?? generateId(),
        channel: 'telegram',
        accountId: bindInput.accountId,
        label: buildDefaultLabel(bindInput),
        target: {
          kind: 'telegram',
          chatId: bindInput.chatId,
          ...(bindInput.threadId?.trim() ? { threadId: bindInput.threadId.trim() } : {}),
          peerKey: canonical.peerKey,
          threadKey: canonical.threadKey,
        },
        ...(existing?.verifiedAt ? { verifiedAt: existing.verifiedAt } : {}),
        ...(existing?.lastUsedAt ? { lastUsedAt: existing.lastUsedAt } : {}),
        replySessionId: canonical.conversationId,
      });

      if (!existing?.verifiedAt) {
        try {
          await input.telegram.sendEnvelope(buildVerificationEnvelope(endpoint));
          endpoint.verifiedAt = baseTimestamp;
        } catch {
          delete endpoint.verifiedAt;
        }
      }

      const saved = input.store.saveEndpoint(endpoint);
      saveIfVerifiedAndNoDefault(saved);
      return saved;
    },
    updateEndpoint(inputValue: { endpointId: string; label: string }): AutomationEndpoint {
      const existing = input.store.getEndpoint(inputValue.endpointId);
      if (!existing) {
        throw new Error('Automation endpoint not found.');
      }
      const next = automationEndpointSchema.parse({
        ...existing,
        label: inputValue.label.trim(),
      });
      return input.store.saveEndpoint(next);
    },
    removeEndpoint(endpointId: string): void {
      input.store.removeEndpoint(endpointId);
    },
    setDefaultEndpoint(endpointId?: string): void {
      input.store.setDefaultEndpoint(endpointId);
    },
  };
};

export type AutomationEndpointsService = ReturnType<typeof createAutomationEndpointsService>;

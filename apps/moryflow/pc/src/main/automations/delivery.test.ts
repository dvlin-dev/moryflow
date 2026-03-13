/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import type { AutomationEndpoint, AutomationJob } from '@moryflow/automations-core';

const createJob = (): AutomationJob => ({
  id: 'job-1',
  name: 'Daily summary',
  enabled: true,
  source: {
    kind: 'conversation-session',
    origin: 'conversation-entry',
    vaultPath: '/tmp/workspace',
    displayTitle: 'Inbox',
    sessionId: 'session-1',
  },
  schedule: {
    kind: 'every',
    intervalMs: 60_000,
  },
  payload: {
    kind: 'agent-turn',
    message: 'Summarize updates',
    contextDepth: 6,
  },
  delivery: {
    mode: 'push',
    endpointId: 'endpoint-1',
  },
  executionPolicy: {
    approvalMode: 'unattended',
    toolPolicy: { allow: [{ tool: 'Read' }] },
    networkPolicy: { mode: 'deny' },
    fileSystemPolicy: { mode: 'vault_only' },
    requiresExplicitConfirmation: true,
  },
  state: {},
  createdAt: 1,
  updatedAt: 1,
});

describe('automation delivery', () => {
  it('sends telegram message, self-heals replySessionId and syncs conversation UI', async () => {
    const endpoint: AutomationEndpoint = {
      id: 'endpoint-1',
      channel: 'telegram',
      accountId: 'account-1',
      label: 'Updates',
      target: {
        kind: 'telegram',
        chatId: 'chat-1',
        threadId: '42',
        peerKey: 'telegram:account-1:peer:chat-1',
        threadKey: 'telegram:account-1:peer:chat-1:thread:42',
      },
      verifiedAt: '2026-03-13T00:00:00.000Z',
      replySessionId: 'stale-session',
    };
    const saveEndpoint = vi.fn((next: AutomationEndpoint) => next);
    const appendHistory = vi.fn();
    const syncConversationUiState = vi.fn(async () => undefined);
    const { createAutomationDelivery } = await import('./delivery.js');
    const delivery = createAutomationDelivery({
      store: {
        getEndpoint: () => endpoint,
        saveEndpoint,
      } as never,
      chatSessionStore: {
        appendHistory,
      } as never,
      syncConversationUiState,
      telegram: {
        sendEnvelope: vi.fn(async () => undefined),
        ensureReplyConversation: vi.fn(async () => ({
          peerKey: endpoint.target.peerKey,
          threadKey: endpoint.target.threadKey,
          conversationId: 'reply-session-1',
        })),
      } as never,
      nowIso: () => '2026-03-13T00:00:00.000Z',
    });

    const result = await delivery.deliver(createJob(), 'Report ready');

    expect(result.deliveryStatus).toBe('delivered');
    expect(saveEndpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        replySessionId: 'reply-session-1',
        lastUsedAt: '2026-03-13T00:00:00.000Z',
      })
    );
    expect(appendHistory).toHaveBeenCalledWith(
      'reply-session-1',
      expect.arrayContaining([expect.objectContaining({ role: 'assistant' })])
    );
    expect(syncConversationUiState).toHaveBeenCalledWith('reply-session-1');
  });

  it('keeps delivery status as delivered when local reply-session sync fails after send', async () => {
    const endpoint: AutomationEndpoint = {
      id: 'endpoint-1',
      channel: 'telegram',
      accountId: 'account-1',
      label: 'Updates',
      target: {
        kind: 'telegram',
        chatId: 'chat-1',
        threadId: '42',
        peerKey: 'telegram:account-1:peer:chat-1',
        threadKey: 'telegram:account-1:peer:chat-1:thread:42',
      },
      verifiedAt: '2026-03-13T00:00:00.000Z',
      replySessionId: 'stale-session',
    };
    const sendEnvelope = vi.fn(async () => undefined);
    const syncConversationUiState = vi.fn(async () => {
      throw new Error('sync failed');
    });
    const { createAutomationDelivery } = await import('./delivery.js');
    const delivery = createAutomationDelivery({
      store: {
        getEndpoint: () => endpoint,
        saveEndpoint: vi.fn((next: AutomationEndpoint) => next),
      } as never,
      chatSessionStore: {
        appendHistory: vi.fn(() => {
          throw new Error('append failed');
        }),
      } as never,
      syncConversationUiState,
      telegram: {
        sendEnvelope,
        ensureReplyConversation: vi.fn(async () => ({
          peerKey: endpoint.target.peerKey,
          threadKey: endpoint.target.threadKey,
          conversationId: 'reply-session-1',
        })),
      } as never,
      nowIso: () => '2026-03-13T00:00:00.000Z',
    });

    const result = await delivery.deliver(createJob(), 'Report ready');

    expect(sendEnvelope).toHaveBeenCalledTimes(1);
    expect(result.deliveryStatus).toBe('delivered');
    expect(result.localSyncError).toContain('append failed');
    expect(syncConversationUiState).not.toHaveBeenCalled();
  });
});

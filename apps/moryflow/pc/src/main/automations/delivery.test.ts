/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import type { AutomationJob } from '@moryflow/automations-core';

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
    target: {
      channel: 'telegram',
      accountId: 'default',
      chatId: 'chat-1',
      label: 'Telegram chat-1',
    },
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
  it('sends telegram message and syncs conversation UI', async () => {
    const appendHistory = vi.fn();
    const syncConversationUiState = vi.fn(async () => undefined);
    const { createAutomationDelivery } = await import('./delivery.js');
    const delivery = createAutomationDelivery({
      chatSessionStore: {
        appendHistory,
      } as never,
      syncConversationUiState,
      telegram: {
        sendEnvelope: vi.fn(async () => undefined),
        ensureReplyConversation: vi.fn(async () => ({
          peerKey: 'telegram:default:peer:chat-1',
          threadKey: 'telegram:default:peer:chat-1',
          conversationId: 'reply-session-1',
        })),
      } as never,
    });

    const result = await delivery.deliver(createJob(), 'Report ready');

    expect(result.deliveryStatus).toBe('delivered');
    expect(appendHistory).toHaveBeenCalledWith(
      'reply-session-1',
      expect.arrayContaining([expect.objectContaining({ role: 'assistant' })])
    );
    expect(syncConversationUiState).toHaveBeenCalledWith('reply-session-1');
  });

  it('keeps delivery status as delivered when local reply-session sync fails after send', async () => {
    const sendEnvelope = vi.fn(async () => undefined);
    const syncConversationUiState = vi.fn(async () => {
      throw new Error('sync failed');
    });
    const { createAutomationDelivery } = await import('./delivery.js');
    const delivery = createAutomationDelivery({
      chatSessionStore: {
        appendHistory: vi.fn(() => {
          throw new Error('append failed');
        }),
      } as never,
      syncConversationUiState,
      telegram: {
        sendEnvelope,
        ensureReplyConversation: vi.fn(async () => ({
          peerKey: 'telegram:default:peer:chat-1',
          threadKey: 'telegram:default:peer:chat-1',
          conversationId: 'reply-session-1',
        })),
      } as never,
    });

    const result = await delivery.deliver(createJob(), 'Report ready');

    expect(sendEnvelope).toHaveBeenCalledTimes(1);
    expect(result.deliveryStatus).toBe('delivered');
    expect(result.localSyncError).toContain('append failed');
    expect(syncConversationUiState).not.toHaveBeenCalled();
  });
});

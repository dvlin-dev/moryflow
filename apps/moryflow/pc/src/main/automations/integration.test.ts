/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import type { AutomationJob } from '@moryflow/automations-core';
import type { AutomationRunRecord } from './run-log.js';

const createJob = (now: number): AutomationJob => ({
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
  createdAt: now - 60_000,
  updatedAt: now - 60_000,
});

describe('automation integration', () => {
  it('runs scheduler -> delivery -> reply session append -> ui sync', async () => {
    const now = 1_000_000;
    let savedJob = createJob(now);
    const appendHistory = vi.fn();
    const syncConversationUiState = vi.fn(async () => undefined);
    const saveJob = vi.fn((job: AutomationJob) => {
      savedJob = job;
      return job;
    });
    let scheduledHandler: (() => Promise<void> | void) | null = null;

    const { createAutomationDelivery } = await import('./delivery.js');
    const { createAutomationScheduler } = await import('./scheduler.js');
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

    const scheduler = createAutomationScheduler({
      store: {
        listJobs: () => [savedJob],
        saveJob,
      } as never,
      runner: {
        runAutomationTurn: async (job) => {
          const deliveryResult = await delivery.deliver(job, 'Report ready');
          const runRecord: AutomationRunRecord = {
            id: 'run-1',
            jobId: job.id,
            startedAt: now,
            finishedAt: now + 1,
            status: 'ok',
            outputText: 'Report ready',
          };
          return {
            outputText: 'Report ready',
            runRecord,
            nextState: {
              lastRunAt: now + 1,
              lastRunStatus: 'ok',
              lastDurationMs: 1,
              consecutiveErrors: 0,
              lastDeliveryStatus: deliveryResult.deliveryStatus,
            },
          };
        },
      },
      powerMonitor: {
        on: vi.fn(),
        off: vi.fn(),
      },
      now: () => now,
      setTimer: (handler) => {
        scheduledHandler = handler;
        return 1 as never;
      },
      clearTimer: vi.fn(),
    });

    scheduler.init();
    await scheduledHandler?.();

    expect(appendHistory).toHaveBeenCalledWith(
      'reply-session-1',
      expect.arrayContaining([expect.objectContaining({ role: 'assistant' })])
    );
    expect(syncConversationUiState).toHaveBeenCalledWith('reply-session-1');
    expect(saveJob).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          lastRunStatus: 'ok',
          lastDeliveryStatus: 'delivered',
        }),
      })
    );
  });
});

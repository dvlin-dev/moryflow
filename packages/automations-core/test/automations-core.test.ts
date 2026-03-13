import { describe, expect, it } from 'vitest';
import {
  automationContextRecordSchema,
  automationEndpointSchema,
  automationExecutionPolicySchema,
  automationJobSchema,
} from '../src/index';

describe('automations-core contracts', () => {
  it('accepts job with conversation-session source and telegram endpoint target', () => {
    const parsed = automationJobSchema.parse({
      id: 'job_1',
      name: 'Daily summary',
      enabled: true,
      source: {
        kind: 'conversation-session',
        origin: 'conversation-entry',
        vaultPath: '/tmp/workspace',
        displayTitle: 'Inbox',
        sessionId: 'session_1',
      },
      schedule: {
        kind: 'every',
        intervalMs: 60 * 60 * 1000,
      },
      payload: {
        kind: 'agent-turn',
        message: 'Summarize the latest updates.',
        contextDepth: 6,
      },
      delivery: {
        mode: 'push',
        endpointId: 'endpoint_1',
      },
      executionPolicy: {
        approvalMode: 'unattended',
        toolPolicy: {
          allow: [{ tool: 'Read' }],
        },
        networkPolicy: {
          mode: 'deny',
        },
        fileSystemPolicy: {
          mode: 'vault_only',
        },
        requiresExplicitConfirmation: true,
      },
      state: {
        nextRunAt: Date.now() + 1000,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    expect(parsed.source.kind).toBe('conversation-session');
    expect(parsed.payload.kind).toBe('agent-turn');
  });

  it('accepts automation-context record and rejects chat-session fields', () => {
    const parsed = automationContextRecordSchema.parse({
      id: 'context_1',
      vaultPath: '/tmp/workspace',
      title: 'New automation',
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    expect(parsed.id).toBe('context_1');
    expect(() =>
      automationContextRecordSchema.parse({
        ...parsed,
        preferredModelId: 'openai/gpt-5',
      })
    ).toThrow();
  });

  it('requires canonical thread binding on telegram endpoints', () => {
    const parsed = automationEndpointSchema.parse({
      id: 'endpoint_1',
      channel: 'telegram',
      accountId: 'account_1',
      label: 'My Telegram',
      target: {
        kind: 'telegram',
        chatId: 'chat_1',
        threadId: '42',
        peerKey: 'telegram:account_1:peer:chat_1',
        threadKey: 'telegram:account_1:peer:chat_1:thread:42',
        title: 'My thread',
      },
      verifiedAt: new Date().toISOString(),
      replySessionId: 'session_reply_1',
    });

    expect(parsed.replySessionId).toBe('session_reply_1');
  });

  it('requires execution policy to be expressible as runtime permission inputs', () => {
    const parsed = automationExecutionPolicySchema.parse({
      approvalMode: 'unattended',
      toolPolicy: {
        allow: [{ tool: 'Read' }, { tool: 'Read' }],
      },
      networkPolicy: {
        mode: 'deny',
      },
      fileSystemPolicy: {
        mode: 'vault_only',
      },
      requiresExplicitConfirmation: true,
    });

    expect(parsed.approvalMode).toBe('unattended');
    expect(parsed.toolPolicy.allow).toEqual([{ tool: 'Read' }]);
  });
});

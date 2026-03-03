import { describe, expect, it } from 'vitest';
import {
  evaluateInboundPolicy,
  resolveThreadKey,
  classifyDeliveryFailure,
  computeRetryDelayMs,
  type ChannelPolicyConfig,
  type InboundEnvelope,
} from '../src';

const buildEnvelope = (patch?: Partial<InboundEnvelope>): InboundEnvelope => ({
  channel: 'telegram',
  accountId: 'default',
  eventId: 'evt-1',
  eventKind: 'message',
  occurredAt: '2026-03-03T00:00:00.000Z',
  peer: {
    id: '123',
    type: 'private',
  },
  sender: {
    id: 'u_1',
  },
  message: {
    text: 'hello',
    hasMention: false,
  },
  raw: {},
  ...patch,
});

const basePolicy: ChannelPolicyConfig = {
  dmPolicy: 'pairing',
  allowFrom: [],
  groupPolicy: 'allowlist',
  groupAllowFrom: ['100'],
  requireMentionByDefault: true,
  groups: {
    '-100': {
      requireMention: true,
      topics: {
        '42': { requireMention: false },
      },
    },
  },
};

describe('channels-core', () => {
  it('DM pairing 未通过时返回 requiresPairing', async () => {
    const decision = await evaluateInboundPolicy(
      {
        config: basePolicy,
        hasApprovedDmSender: async () => false,
      },
      buildEnvelope()
    );

    expect(decision.allowed).toBe(false);
    expect(decision.requiresPairing).toBe(true);
    expect(decision.reason).toBe('pairing_required');
  });

  it('DM pairing 通过后允许', async () => {
    const decision = await evaluateInboundPolicy(
      {
        config: basePolicy,
        hasApprovedDmSender: async () => true,
      },
      buildEnvelope()
    );

    expect(decision).toEqual({
      allowed: true,
      requiresPairing: false,
      reason: 'allow',
    });
  });

  it('group allowlist + mention 校验按配置生效', async () => {
    const deniedByAllowlist = await evaluateInboundPolicy(
      {
        config: basePolicy,
        hasApprovedDmSender: async () => true,
      },
      buildEnvelope({
        peer: {
          id: '-100',
          type: 'supergroup',
        },
        sender: { id: 'not-allowed' },
      })
    );

    expect(deniedByAllowlist.reason).toBe('group_allowlist_denied');

    const deniedByMention = await evaluateInboundPolicy(
      {
        config: {
          ...basePolicy,
          groupPolicy: 'open',
        },
        hasApprovedDmSender: async () => true,
      },
      buildEnvelope({
        peer: {
          id: '-100',
          type: 'supergroup',
        },
        sender: { id: 'anyone' },
        message: {
          text: 'hello all',
          hasMention: false,
        },
      })
    );

    expect(deniedByMention.reason).toBe('group_mention_required');

    const allowedTopicOverride = await evaluateInboundPolicy(
      {
        config: {
          ...basePolicy,
          groupPolicy: 'open',
        },
        hasApprovedDmSender: async () => true,
      },
      buildEnvelope({
        peer: {
          id: '-100',
          type: 'supergroup',
        },
        sender: { id: 'anyone' },
        message: {
          text: 'topic message',
          hasMention: false,
          threadId: '42',
        },
      })
    );

    expect(allowedTopicOverride.reason).toBe('allow');
    expect(allowedTopicOverride.allowed).toBe(true);
  });

  it('thread key 对 message/callback/reaction 只依赖 peer + thread', () => {
    const messageThread = resolveThreadKey(
      buildEnvelope({
        peer: { id: '-100', type: 'supergroup' },
        message: { text: 'msg', threadId: '7' },
      })
    );
    const callbackThread = resolveThreadKey(
      buildEnvelope({
        eventKind: 'callback_query',
        peer: { id: '-100', type: 'supergroup' },
        message: { callbackData: 'ok', threadId: '7' },
      })
    );

    expect(callbackThread.sessionKey).toBe(messageThread.sessionKey);
    expect(callbackThread.threadKey).toBe(messageThread.threadKey);
  });

  it('发送异常分类与退避策略正确', () => {
    expect(
      classifyDeliveryFailure({
        response: { error_code: 400, description: "Bad Request: can't parse entities" },
      })
    ).toBe('fallback_plaintext');

    expect(
      classifyDeliveryFailure({
        response: { error_code: 400, description: 'Bad Request: message thread not found' },
      })
    ).toBe('fallback_threadless');

    expect(
      classifyDeliveryFailure({
        response: { error_code: 429, description: 'Too Many Requests: retry later' },
      })
    ).toBe('retryable');

    expect(computeRetryDelayMs(1)).toBe(400);
    expect(computeRetryDelayMs(3)).toBe(1600);
  });
});

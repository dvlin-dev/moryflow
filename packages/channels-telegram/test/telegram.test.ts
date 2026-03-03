import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const grammyMocks = vi.hoisted(() => ({
  getMe: vi.fn(),
  getUpdates: vi.fn(),
  setWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('grammy', () => {
  class GrammyError extends Error {
    error_code: number;
    description: string;
    method: string;

    constructor(method: string, payload: { error_code: number; description: string }) {
      super(payload.description);
      this.method = method;
      this.error_code = payload.error_code;
      this.description = payload.description;
    }
  }

  class Bot {
    api: {
      getMe: typeof grammyMocks.getMe;
      getUpdates: typeof grammyMocks.getUpdates;
      setWebhook: typeof grammyMocks.setWebhook;
      deleteWebhook: typeof grammyMocks.deleteWebhook;
      sendMessage: typeof grammyMocks.sendMessage;
    };

    constructor(_token: string) {
      this.api = {
        getMe: grammyMocks.getMe,
        getUpdates: grammyMocks.getUpdates,
        setWebhook: grammyMocks.setWebhook,
        deleteWebhook: grammyMocks.deleteWebhook,
        sendMessage: grammyMocks.sendMessage,
      };
    }
  }

  return { Bot, GrammyError };
});

import {
  normalizeTelegramUpdate,
  parseTelegramAccountConfig,
  parseTelegramTarget,
  createTelegramRuntime,
} from '../src';

describe('channels-telegram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    grammyMocks.getMe.mockResolvedValue({ id: 1, username: 'mory_bot', is_bot: true });
    grammyMocks.getUpdates.mockResolvedValue([]);
    grammyMocks.setWebhook.mockResolvedValue(true);
    grammyMocks.deleteWebhook.mockResolvedValue(true);
    grammyMocks.sendMessage.mockResolvedValue({ message_id: 100 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('config 在 webhook 模式下强制要求 webhook 配置', () => {
    expect(() =>
      parseTelegramAccountConfig({
        accountId: 'default',
        botToken: 'token',
        mode: 'webhook',
      })
    ).toThrowError(/webhook config is required/i);
  });

  it('target 支持 chatId#threadId 语法', () => {
    expect(parseTelegramTarget('-100123#42')).toEqual({
      chatId: '-100123',
      threadId: '42',
    });
  });

  it('message update 归一化为 envelope', () => {
    const envelope = normalizeTelegramUpdate({
      accountId: 'default',
      botUsername: 'mory_bot',
      update: {
        update_id: 7,
        message: {
          message_id: 8,
          date: 1_700_000_000,
          text: '@mory_bot hi',
          entities: [{ type: 'mention', offset: 0, length: 9 }],
          chat: {
            id: -100,
            type: 'supergroup',
            title: 'group',
          },
          from: {
            id: 200,
            is_bot: false,
            first_name: 'foo',
          },
          message_thread_id: 42,
        },
      } as any,
    });

    expect(envelope).not.toBeNull();
    expect(envelope?.message.hasMention).toBe(true);
    expect(envelope?.message.threadId).toBe('42');
    expect(envelope?.peer.type).toBe('supergroup');
  });

  it('send 在 HTML 失败时回退纯文本再重试', async () => {
    const { GrammyError } = await import('grammy');
    grammyMocks.sendMessage
      .mockRejectedValueOnce(
        new GrammyError('sendMessage', {
          error_code: 400,
          description: "Bad Request: can't parse entities",
        })
      )
      .mockResolvedValueOnce({ message_id: 101 });

    const config = parseTelegramAccountConfig({
      accountId: 'default',
      botToken: 'token',
      mode: 'webhook',
      webhook: {
        url: 'https://example.com/tg',
        secret: 'sec',
      },
    });

    const runtime = createTelegramRuntime({
      config,
      ports: {
        offsets: {
          getSafeWatermark: async () => null,
          setSafeWatermark: async () => undefined,
        },
        sessions: {
          upsertSession: async () => undefined,
          getSession: async () => null,
        },
        sentMessages: {
          rememberSentMessage: async () => undefined,
        },
        pairing: {
          hasApprovedSender: async () => false,
          createPairingRequest: async (input) => ({
            id: 'pr_1',
            channel: input.channel,
            accountId: input.accountId,
            senderId: input.senderId,
            peerId: input.peerId,
            code: input.code,
            status: 'pending',
            createdAt: input.createdAt,
            lastSeenAt: input.createdAt,
            expiresAt: input.expiresAt,
            meta: input.meta,
          }),
          updatePairingRequestStatus: async () => undefined,
          listPairingRequests: async () => [],
          approveSender: async () => undefined,
        },
      },
      events: {
        onInbound: async () => undefined,
      },
    });

    await runtime.start();
    const result = await runtime.send({
      channel: 'telegram',
      accountId: 'default',
      target: { chatId: '-1001', threadId: '9' },
      message: {
        text: '<b>Hello</b> world',
        format: 'html',
      },
    });
    await runtime.stop();

    expect(result.ok).toBe(true);
    expect(result.usedFallback).toBe('plaintext');
    expect(grammyMocks.sendMessage).toHaveBeenCalledTimes(2);
    expect(grammyMocks.sendMessage.mock.calls[1]?.[1]).toBe('Hello world');
  });

  it('polling 中单条 update 处理失败会退避，避免快速重试循环', async () => {
    vi.useFakeTimers();
    grammyMocks.getUpdates.mockResolvedValue([
      {
        update_id: 11,
        message: {
          message_id: 99,
          date: 1_700_000_001,
          text: 'hi',
          chat: {
            id: 2001,
            type: 'private',
          },
          from: {
            id: 3001,
            is_bot: false,
            first_name: 'u',
          },
        },
      },
    ]);

    const statuses: Array<{ lastError?: string }> = [];

    const config = parseTelegramAccountConfig({
      accountId: 'default',
      botToken: 'token',
      mode: 'polling',
      polling: {
        timeoutSeconds: 5,
        idleDelayMs: 100,
        maxBatchSize: 10,
      },
      policy: {
        dmPolicy: 'open',
        allowFrom: [],
        groupPolicy: 'disabled',
        groupAllowFrom: [],
        requireMentionByDefault: true,
      },
    });

    const runtime = createTelegramRuntime({
      config,
      ports: {
        offsets: {
          getSafeWatermark: async () => null,
          setSafeWatermark: async () => undefined,
        },
        sessions: {
          upsertSession: async () => undefined,
          getSession: async () => null,
        },
        sentMessages: {
          rememberSentMessage: async () => undefined,
        },
        pairing: {
          hasApprovedSender: async () => false,
          createPairingRequest: async (input) => ({
            id: 'pr_2',
            channel: input.channel,
            accountId: input.accountId,
            senderId: input.senderId,
            peerId: input.peerId,
            code: input.code,
            status: 'pending',
            createdAt: input.createdAt,
            lastSeenAt: input.createdAt,
            expiresAt: input.expiresAt,
            meta: input.meta,
          }),
          updatePairingRequestStatus: async () => undefined,
          listPairingRequests: async () => [],
          approveSender: async () => undefined,
        },
      },
      events: {
        onInbound: async () => {
          throw new Error('inbound boom');
        },
        onStatusChange: (status) => {
          statuses.push({ lastError: status.lastError });
        },
      },
    });

    await runtime.start();
    await vi.runAllTicks();
    await Promise.resolve();
    expect(grammyMocks.getUpdates).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(99);
    expect(grammyMocks.getUpdates).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(grammyMocks.getUpdates).toHaveBeenCalledTimes(2);
    expect(statuses.some((status) => status.lastError?.includes('failed to process update'))).toBe(
      true
    );

    const stopPromise = runtime.stop();
    await vi.runOnlyPendingTimersAsync();
    await stopPromise;
  });

  it('polling 批内后续 update 失败时会先推进已成功项 watermark', async () => {
    vi.useFakeTimers();
    grammyMocks.getUpdates.mockResolvedValue([
      {
        update_id: 21,
        message: {
          message_id: 1,
          date: 1_700_000_010,
          text: 'ok-1',
          chat: {
            id: 5001,
            type: 'private',
          },
          from: {
            id: 6001,
            is_bot: false,
            first_name: 'u1',
          },
        },
      },
      {
        update_id: 22,
        message: {
          message_id: 2,
          date: 1_700_000_011,
          text: 'boom-2',
          chat: {
            id: 5001,
            type: 'private',
          },
          from: {
            id: 6001,
            is_bot: false,
            first_name: 'u1',
          },
        },
      },
    ]);

    let safeWatermark: number | null = null;
    const setWatermarkSpy = vi.fn(async (_accountId: string, updateId: number) => {
      safeWatermark = updateId;
    });

    let inboundCount = 0;

    const config = parseTelegramAccountConfig({
      accountId: 'default',
      botToken: 'token',
      mode: 'polling',
      polling: {
        timeoutSeconds: 5,
        idleDelayMs: 100,
        maxBatchSize: 10,
      },
      policy: {
        dmPolicy: 'open',
        allowFrom: [],
        groupPolicy: 'disabled',
        groupAllowFrom: [],
        requireMentionByDefault: true,
      },
    });

    const runtime = createTelegramRuntime({
      config,
      ports: {
        offsets: {
          getSafeWatermark: async () => safeWatermark,
          setSafeWatermark: setWatermarkSpy,
        },
        sessions: {
          upsertSession: async () => undefined,
          getSession: async () => null,
        },
        sentMessages: {
          rememberSentMessage: async () => undefined,
        },
        pairing: {
          hasApprovedSender: async () => false,
          createPairingRequest: async (input) => ({
            id: 'pr_3',
            channel: input.channel,
            accountId: input.accountId,
            senderId: input.senderId,
            peerId: input.peerId,
            code: input.code,
            status: 'pending',
            createdAt: input.createdAt,
            lastSeenAt: input.createdAt,
            expiresAt: input.expiresAt,
            meta: input.meta,
          }),
          updatePairingRequestStatus: async () => undefined,
          listPairingRequests: async () => [],
          approveSender: async () => undefined,
        },
      },
      events: {
        onInbound: async () => {
          inboundCount += 1;
          if (inboundCount >= 2) {
            throw new Error('second update failed');
          }
        },
      },
    });

    await runtime.start();
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(100);

    expect(setWatermarkSpy).toHaveBeenCalledWith('default', 21);
    expect(safeWatermark).toBe(21);

    const stopPromise = runtime.stop();
    await vi.runOnlyPendingTimersAsync();
    await stopPromise;
  });
});

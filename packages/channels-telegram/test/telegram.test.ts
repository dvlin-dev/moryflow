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

  it('channel_post 在缺失 from 时应回退 sender_chat 作为 sender', () => {
    const envelope = normalizeTelegramUpdate({
      accountId: 'default',
      botUsername: 'mory_bot',
      update: {
        update_id: 9,
        channel_post: {
          message_id: 10,
          date: 1_700_000_001,
          text: 'channel update',
          chat: {
            id: -200,
            type: 'channel',
            title: 'news',
            username: 'news_channel',
          },
          sender_chat: {
            id: -200,
            type: 'channel',
            title: 'news',
            username: 'news_channel',
          },
        },
      } as any,
    });

    expect(envelope).not.toBeNull();
    expect(envelope?.eventKind).toBe('channel_post');
    expect(envelope?.sender).toMatchObject({
      id: '-200',
      username: 'news_channel',
    });
  });

  it('botUsername 缺失时不应将任意 mention 视为 hasMention=true', () => {
    const envelope = normalizeTelegramUpdate({
      accountId: 'default',
      update: {
        update_id: 8,
        message: {
          message_id: 9,
          date: 1_700_000_000,
          text: '@other_bot hi',
          entities: [{ type: 'mention', offset: 0, length: 10 }],
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
    expect(envelope?.message.hasMention).toBe(false);
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

  it('maxSendRetries=1 时仍会执行 plaintext fallback resend', async () => {
    const { GrammyError } = await import('grammy');
    grammyMocks.sendMessage
      .mockRejectedValueOnce(
        new GrammyError('sendMessage', {
          error_code: 400,
          description: "Bad Request: can't parse entities",
        })
      )
      .mockResolvedValueOnce({ message_id: 202 });

    const config = parseTelegramAccountConfig({
      accountId: 'default',
      botToken: 'token',
      mode: 'webhook',
      webhook: {
        url: 'https://example.com/tg',
        secret: 'sec',
      },
      maxSendRetries: 1,
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
            id: 'pr_fallback_text_1',
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

  it('maxSendRetries=1 时仍会执行 threadless fallback resend', async () => {
    const { GrammyError } = await import('grammy');
    grammyMocks.sendMessage
      .mockRejectedValueOnce(
        new GrammyError('sendMessage', {
          error_code: 400,
          description: 'Bad Request: message thread not found',
        })
      )
      .mockResolvedValueOnce({ message_id: 203 });

    const config = parseTelegramAccountConfig({
      accountId: 'default',
      botToken: 'token',
      mode: 'webhook',
      webhook: {
        url: 'https://example.com/tg',
        secret: 'sec',
      },
      maxSendRetries: 1,
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
            id: 'pr_fallback_thread_1',
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
        text: 'Hello from thread',
        format: 'text',
      },
    });
    await runtime.stop();

    expect(result.ok).toBe(true);
    expect(result.usedFallback).toBe('threadless');
    expect(grammyMocks.sendMessage).toHaveBeenCalledTimes(2);
    expect(grammyMocks.sendMessage.mock.calls[0]?.[2]).toMatchObject({
      message_thread_id: 9,
    });
    expect(grammyMocks.sendMessage.mock.calls[1]?.[2]).toMatchObject({
      message_thread_id: undefined,
    });
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

  it('webhook 在启动握手期收到有效 mention 时会等待 bot identity 再处理', async () => {
    let resolveGetMe: ((value: { id: number; username: string; is_bot: boolean }) => void) | null =
      null;
    const getMePromise = new Promise<{ id: number; username: string; is_bot: boolean }>(
      (resolve) => {
        resolveGetMe = resolve;
      }
    );
    grammyMocks.getMe.mockImplementationOnce(() => getMePromise);

    const onInbound = vi.fn(async () => undefined);
    const config = parseTelegramAccountConfig({
      accountId: 'default',
      botToken: 'token',
      mode: 'webhook',
      webhook: {
        url: 'https://example.com/tg',
        secret: 'sec',
      },
      policy: {
        dmPolicy: 'open',
        allowFrom: [],
        groupPolicy: 'open',
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
            id: 'pr_webhook_startup_identity_1',
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
        onInbound,
      },
    });

    const startPromise = runtime.start();
    const handlePromise = runtime.handleWebhookUpdate({
      update_id: 77,
      message: {
        message_id: 5001,
        date: 1_700_000_001,
        text: '@mory_bot hi',
        entities: [{ type: 'mention', offset: 0, length: 9 }],
        chat: {
          id: -1002001,
          type: 'supergroup',
          title: 'group',
        },
        from: {
          id: 3001,
          is_bot: false,
          first_name: 'user',
        },
      },
    } as any);

    expect(onInbound).not.toHaveBeenCalled();

    resolveGetMe?.({ id: 1, username: 'mory_bot', is_bot: true });
    await startPromise;
    await handlePromise;
    await runtime.stop();

    expect(grammyMocks.getMe).toHaveBeenCalledTimes(1);
    expect(onInbound).toHaveBeenCalledTimes(1);
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

  it('polling 单个 update 连续失败达到上限后会跳过并继续处理后续 update', async () => {
    vi.useFakeTimers();
    const updates = [
      {
        update_id: 31,
        message: {
          message_id: 31,
          date: 1_700_000_100,
          text: 'poison',
          chat: {
            id: 7001,
            type: 'private',
          },
          from: {
            id: 8001,
            is_bot: false,
            first_name: 'u31',
          },
        },
      },
      {
        update_id: 32,
        message: {
          message_id: 32,
          date: 1_700_000_101,
          text: 'ok',
          chat: {
            id: 7001,
            type: 'private',
          },
          from: {
            id: 8001,
            is_bot: false,
            first_name: 'u31',
          },
        },
      },
    ];

    let safeWatermark: number | null = 30;
    const setSafeWatermark = vi.fn(async (_accountId: string, updateId: number) => {
      safeWatermark = updateId;
    });
    let resolveIdlePoll: ((value: any[]) => void) | null = null;
    const idlePollPromise = new Promise<any[]>((resolve) => {
      resolveIdlePoll = resolve;
    });

    grammyMocks.getUpdates.mockImplementation(async (payload?: { offset?: number }) => {
      if (payload?.offset === 33) {
        return idlePollPromise;
      }
      return updates as any;
    });

    const onInbound = vi.fn(async ({ envelope }: any) => {
      if (envelope.message.text === 'poison') {
        throw new Error('poison update');
      }
    });

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
          setSafeWatermark,
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
            id: 'pr_polling_skip_poison_1',
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
        onInbound,
      },
    });

    await runtime.start();
    await vi.runAllTicks();
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(1_000);

    expect(safeWatermark).toBe(32);
    expect(setSafeWatermark).toHaveBeenCalledWith('default', 32);
    expect(
      onInbound.mock.calls.filter((call) => call[0]?.envelope?.message?.text === 'poison')
    ).toHaveLength(3);
    expect(
      onInbound.mock.calls.filter((call) => call[0]?.envelope?.message?.text === 'ok')
    ).toHaveLength(1);

    const stopPromise = runtime.stop();
    resolveIdlePoll?.([]);
    await vi.runOnlyPendingTimersAsync();
    await stopPromise;
  });

  it('polling 遇到 non-retryable transport 错误会进入终态并停止轮询', async () => {
    const { GrammyError } = await import('grammy');
    vi.useFakeTimers();
    grammyMocks.getUpdates.mockRejectedValue(
      new GrammyError('getUpdates', {
        error_code: 401,
        description: 'Unauthorized',
      })
    );

    const statuses: Array<{ running: boolean; lastError?: string }> = [];

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
            id: 'pr_transport_stop_1',
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
        onStatusChange: (status) => {
          statuses.push({ running: status.running, lastError: status.lastError });
        },
      },
    });

    await runtime.start();
    await vi.runAllTicks();
    await Promise.resolve();

    expect(grammyMocks.getUpdates).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(grammyMocks.getUpdates).toHaveBeenCalledTimes(1);
    expect(runtime.getStatus().running).toBe(false);
    expect(
      statuses.some(
        (status) =>
          status.running === false &&
          typeof status.lastError === 'string' &&
          status.lastError.includes('Unauthorized')
      )
    ).toBe(true);

    await runtime.stop();
  });

  it('polling 遇到 409 conflict 会重置 webhook 并继续轮询', async () => {
    const { GrammyError } = await import('grammy');
    vi.useFakeTimers();
    let resolveSecondPoll: ((updates: any[]) => void) | null = null;
    const secondPollPromise = new Promise<any[]>((resolve) => {
      resolveSecondPoll = resolve;
    });
    grammyMocks.getUpdates
      .mockRejectedValueOnce(
        new GrammyError('getUpdates', {
          error_code: 409,
          description: 'Conflict: terminated by other getUpdates request',
        })
      )
      .mockImplementationOnce(() => secondPollPromise);

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
            id: 'pr_polling_conflict_1',
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
    await vi.runAllTicks();
    await Promise.resolve();

    expect(grammyMocks.getUpdates).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(100);
    expect(grammyMocks.getUpdates).toHaveBeenCalledTimes(2);
    expect(grammyMocks.deleteWebhook).toHaveBeenCalledTimes(2);
    expect(runtime.getStatus().running).toBe(true);

    const stopPromise = runtime.stop();
    resolveSecondPoll?.([]);
    await stopPromise;
  });

  it('webhook 模式对重复 update_id 去重，避免重复处理', async () => {
    const onInbound = vi.fn(async () => undefined);
    let safeWatermark: number | null = null;
    const setSafeWatermark = vi.fn(async (_accountId: string, updateId: number) => {
      safeWatermark = updateId;
    });

    const config = parseTelegramAccountConfig({
      accountId: 'default',
      botToken: 'token',
      mode: 'webhook',
      webhook: {
        url: 'https://example.com/tg',
        secret: 'sec',
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
          setSafeWatermark,
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
            id: 'pr_webhook_dedup_1',
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
        onInbound,
      },
    });

    const createUpdate = (updateId: number) =>
      ({
        update_id: updateId,
        message: {
          message_id: updateId,
          date: 1_700_000_000 + updateId,
          text: 'hello',
          chat: {
            id: 2001,
            type: 'private',
          },
          from: {
            id: 3001,
            is_bot: false,
            first_name: 'user',
          },
        },
      }) as any;

    await runtime.start();
    await runtime.handleWebhookUpdate(createUpdate(5));
    await runtime.handleWebhookUpdate(createUpdate(5));
    await runtime.handleWebhookUpdate(createUpdate(4));
    await runtime.handleWebhookUpdate(createUpdate(6));
    await runtime.stop();

    expect(onInbound).toHaveBeenCalledTimes(3);
    expect(setSafeWatermark).not.toHaveBeenCalled();
  });

  it('webhook 在初始 watermark 缺失时不应因乱序而丢弃更小 update_id', async () => {
    const onInbound = vi.fn(async () => undefined);
    let safeWatermark: number | null = null;
    const setSafeWatermark = vi.fn(async (_accountId: string, updateId: number) => {
      safeWatermark = updateId;
    });

    const config = parseTelegramAccountConfig({
      accountId: 'default',
      botToken: 'token',
      mode: 'webhook',
      webhook: {
        url: 'https://example.com/tg',
        secret: 'sec',
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
          setSafeWatermark,
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
            id: 'pr_webhook_bootstrap_missing_watermark_1',
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
        onInbound,
      },
    });

    const createUpdate = (updateId: number, text: string) =>
      ({
        update_id: updateId,
        message: {
          message_id: updateId,
          date: 1_700_000_300 + updateId,
          text,
          chat: {
            id: 2010,
            type: 'private',
          },
          from: {
            id: 3010,
            is_bot: false,
            first_name: 'user',
          },
        },
      }) as any;

    await runtime.start();
    await runtime.handleWebhookUpdate(createUpdate(12, 'u12'));
    await runtime.handleWebhookUpdate(createUpdate(11, 'u11'));
    await runtime.handleWebhookUpdate(createUpdate(12, 'u12'));
    await runtime.stop();

    expect(onInbound.mock.calls.map((call) => call[0]?.envelope?.message?.text)).toEqual([
      'u12',
      'u11',
    ]);
    expect(setSafeWatermark).not.toHaveBeenCalled();
  });

  it('webhook 仅在 update_id 连续时推进 watermark，避免超前提交导致丢消息', async () => {
    const onInbound = vi.fn(async ({ envelope }: any) => {
      if (envelope.message.text === 'u11' && onInbound.mock.calls.length === 2) {
        throw new Error('u11 failed once');
      }
    });
    let safeWatermark: number | null = 10;
    const setSafeWatermark = vi.fn(async (_accountId: string, updateId: number) => {
      safeWatermark = updateId;
    });

    const config = parseTelegramAccountConfig({
      accountId: 'default',
      botToken: 'token',
      mode: 'webhook',
      webhook: {
        url: 'https://example.com/tg',
        secret: 'sec',
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
          setSafeWatermark,
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
            id: 'pr_webhook_contiguous_watermark_1',
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
        onInbound,
      },
    });

    const createUpdate = (updateId: number, text: string) =>
      ({
        update_id: updateId,
        message: {
          message_id: updateId,
          date: 1_700_000_200 + updateId,
          text,
          chat: {
            id: 2002,
            type: 'private',
          },
          from: {
            id: 3002,
            is_bot: false,
            first_name: 'user',
          },
        },
      }) as any;

    await runtime.start();
    await runtime.handleWebhookUpdate(createUpdate(12, 'u12'));
    expect(safeWatermark).toBe(10);

    await expect(runtime.handleWebhookUpdate(createUpdate(11, 'u11'))).rejects.toThrow(
      'u11 failed once'
    );
    expect(safeWatermark).toBe(10);

    await runtime.handleWebhookUpdate(createUpdate(12, 'u12'));
    expect(
      onInbound.mock.calls.filter((call) => call[0]?.envelope?.message?.text === 'u12')
    ).toHaveLength(1);

    await runtime.handleWebhookUpdate(createUpdate(11, 'u11'));
    await runtime.stop();

    expect(safeWatermark).toBe(12);
    expect(setSafeWatermark).toHaveBeenCalledTimes(1);
    expect(setSafeWatermark).toHaveBeenCalledWith('default', 12);
  });

  it('webhook 缺口 update 连续失败达到上限后会跳过并释放缓冲队列', async () => {
    const onInbound = vi.fn(async ({ envelope }: any) => {
      if (envelope.message.text === 'u11') {
        throw new Error('u11 poisoned');
      }
    });
    let safeWatermark: number | null = 10;
    const setSafeWatermark = vi.fn(async (_accountId: string, updateId: number) => {
      safeWatermark = updateId;
    });

    const config = parseTelegramAccountConfig({
      accountId: 'default',
      botToken: 'token',
      mode: 'webhook',
      webhook: {
        url: 'https://example.com/tg',
        secret: 'sec',
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
          setSafeWatermark,
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
            id: 'pr_webhook_skip_gap_1',
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
        onInbound,
      },
    });

    const createUpdate = (updateId: number, text: string) =>
      ({
        update_id: updateId,
        message: {
          message_id: updateId,
          date: 1_700_000_400 + updateId,
          text,
          chat: {
            id: 2003,
            type: 'private',
          },
          from: {
            id: 3003,
            is_bot: false,
            first_name: 'user',
          },
        },
      }) as any;

    await runtime.start();
    await runtime.handleWebhookUpdate(createUpdate(12, 'u12'));
    await runtime.handleWebhookUpdate(createUpdate(13, 'u13'));
    expect(safeWatermark).toBe(10);

    await expect(runtime.handleWebhookUpdate(createUpdate(11, 'u11'))).rejects.toThrow(
      'u11 poisoned'
    );
    await expect(runtime.handleWebhookUpdate(createUpdate(11, 'u11'))).rejects.toThrow(
      'u11 poisoned'
    );

    await runtime.handleWebhookUpdate(createUpdate(11, 'u11'));
    expect(safeWatermark).toBe(13);

    await runtime.handleWebhookUpdate(createUpdate(12, 'u12'));
    await runtime.handleWebhookUpdate(createUpdate(13, 'u13'));
    await runtime.stop();

    expect(
      onInbound.mock.calls.filter((call) => call[0]?.envelope?.message?.text === 'u12')
    ).toHaveLength(1);
    expect(
      onInbound.mock.calls.filter((call) => call[0]?.envelope?.message?.text === 'u13')
    ).toHaveLength(1);
  });
});

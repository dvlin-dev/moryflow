/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeMock = vi.hoisted(() => ({
  runChatTurn: vi.fn(),
}));

const agentRuntimeMock = vi.hoisted(() => ({
  createChatSession: vi.fn((sessionKey: string) => ({ sessionKey })),
}));

vi.mock('@moryflow/agents-runtime', () => ({
  createRunModelStreamNormalizer: () => ({
    consume: (data: { deltaText?: string }) => ({
      deltaText: data?.deltaText ?? '',
    }),
  }),
  isRunRawModelStreamEvent: (event: { type?: string }) => event?.type === 'raw_model_stream_event',
}));

vi.mock('../../agent-runtime/index.js', () => ({
  createChatSession: agentRuntimeMock.createChatSession,
}));

vi.mock('../../chat/runtime.js', () => ({
  getRuntime: () => ({
    runChatTurn: runtimeMock.runChatTurn,
  }),
}));

import {
  createTelegramInboundReplyHandler,
  createTelegramPairingReminderHandler,
} from './inbound-reply-service.js';

const createRunResult = (input: { deltas: string[]; finalOutput?: string }) => {
  const stream = (async function* () {
    for (const delta of input.deltas) {
      yield {
        type: 'raw_model_stream_event',
        data: { deltaText: delta },
      };
    }
  })() as AsyncIterable<{
    type: string;
    data: { deltaText: string };
  }> & {
    completed: Promise<void>;
    finalOutput?: string;
  };

  stream.completed = Promise.resolve();
  stream.finalOutput = input.finalOutput;

  return {
    result: stream,
  };
};

const createDispatch = (overrides?: Partial<Record<string, unknown>>) =>
  ({
    envelope: {
      eventKind: 'message',
      sender: { id: 'sender_1', isBot: false },
      peer: { id: 'chat_1' },
      message: {
        text: 'hello',
        threadId: undefined,
      },
    },
    thread: {
      sessionKey: 'session_1',
      peerKey: 'peer_key',
      threadKey: 'thread_key',
    },
    ...overrides,
  }) as any;

describe('createTelegramInboundReplyHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('忽略 bot sender 入站消息', async () => {
    const sendEnvelope = vi.fn(async () => undefined);
    const handler = createTelegramInboundReplyHandler({
      accountId: 'default',
      sendEnvelope,
    });

    await handler(
      createDispatch({
        envelope: {
          eventKind: 'message',
          sender: { id: 'bot_1', isBot: true },
          peer: { id: 'chat_1' },
          message: { text: 'ignored' },
        },
      })
    );

    expect(runtimeMock.runChatTurn).not.toHaveBeenCalled();
    expect(sendEnvelope).not.toHaveBeenCalled();
  });

  it('callbackData 入站可触发回复，并按 Telegram 长度分片发送', async () => {
    runtimeMock.runChatTurn.mockResolvedValue(
      createRunResult({
        deltas: ['x'.repeat(4_005)],
      })
    );
    const sendEnvelope = vi.fn(async () => undefined);
    const handler = createTelegramInboundReplyHandler({
      accountId: 'default',
      sendEnvelope,
    });

    await handler(
      createDispatch({
        envelope: {
          eventKind: 'message',
          sender: { id: 'user_1', isBot: false },
          peer: { id: 'chat_1' },
          message: { text: '', callbackData: 'approve', threadId: 12 },
        },
      })
    );

    expect(runtimeMock.runChatTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: 'session_1',
        input: 'User clicked callback: approve',
        mode: 'full_access',
      })
    );
    expect(agentRuntimeMock.createChatSession).toHaveBeenCalledWith('session_1');
    expect(sendEnvelope).toHaveBeenCalledTimes(2);
    expect(sendEnvelope.mock.calls[0][0]).toMatchObject({
      channel: 'telegram',
      accountId: 'default',
      target: { chatId: 'chat_1', threadId: 12 },
      message: { format: 'text' },
    });
    expect((sendEnvelope.mock.calls[0][0] as any).message.text.length).toBe(3_800);
    expect((sendEnvelope.mock.calls[1][0] as any).message.text.length).toBe(205);
  });

  it('private chat 开启 draft streaming 时会发送 preview update 并以 preview commit 收敛', async () => {
    runtimeMock.runChatTurn.mockResolvedValue(
      createRunResult({
        deltas: ['hello', ' world'],
      })
    );
    const sendEnvelope = vi.fn(async () => undefined);
    const handler = createTelegramInboundReplyHandler({
      accountId: 'default',
      sendEnvelope,
      enableDraftStreaming: true,
      draftFlushIntervalMs: 0,
    });

    await handler(
      createDispatch({
        envelope: {
          eventKind: 'message',
          sender: { id: 'user_1', isBot: false },
          peer: { id: '123', type: 'private' },
          message: { text: 'hi', threadId: undefined },
        },
      })
    );

    expect(sendEnvelope).toHaveBeenCalled();
    const previewUpdateCalls = sendEnvelope.mock.calls
      .map((call) => call[0])
      .filter(
        (envelope) =>
          envelope?.message?.delivery?.mode === 'preview' &&
          envelope?.message?.delivery?.action === 'update'
      );
    expect(previewUpdateCalls.length).toBeGreaterThan(0);
    const finalCall = sendEnvelope.mock.calls[sendEnvelope.mock.calls.length - 1]?.[0] as any;
    expect(finalCall.message).toMatchObject({
      text: 'hello world',
      delivery: {
        mode: 'preview',
        action: 'commit',
      },
    });
  });

  it('preview update 失败时应回退到 final 发送，不中断主流程', async () => {
    runtimeMock.runChatTurn.mockResolvedValue(
      createRunResult({
        deltas: ['hello', ' world'],
      })
    );
    const sendEnvelope = vi.fn(async (envelope: any) => {
      if (
        envelope?.message?.delivery?.mode === 'preview' &&
        envelope?.message?.delivery?.action === 'update'
      ) {
        throw new Error('preview update failed');
      }
    });
    const handler = createTelegramInboundReplyHandler({
      accountId: 'default',
      sendEnvelope,
      enableDraftStreaming: true,
      draftFlushIntervalMs: 0,
    });

    await expect(
      handler(
        createDispatch({
          envelope: {
            eventKind: 'message',
            sender: { id: 'user_1', isBot: false },
            peer: { id: '123', type: 'private' },
            message: { text: 'hi', threadId: undefined },
          },
        })
      )
    ).resolves.toBeUndefined();

    const finalFallbackCalls = sendEnvelope.mock.calls
      .map((call) => call[0] as any)
      .filter((envelope) => envelope?.message?.delivery === undefined);
    expect(finalFallbackCalls.length).toBeGreaterThan(0);
    expect(finalFallbackCalls[0]?.message?.text).toBe('hello world');
  });

  it('preview 已发送后 update 失败时应先 clear，再回退 final 发送', async () => {
    runtimeMock.runChatTurn.mockResolvedValue(
      createRunResult({
        deltas: ['hello', ' world'],
      })
    );
    let previewUpdateCount = 0;
    const sendEnvelope = vi.fn(async (envelope: any) => {
      if (
        envelope?.message?.delivery?.mode === 'preview' &&
        envelope?.message?.delivery?.action === 'update'
      ) {
        previewUpdateCount += 1;
        if (previewUpdateCount >= 2) {
          throw new Error('preview update failed on second delta');
        }
      }
    });
    const handler = createTelegramInboundReplyHandler({
      accountId: 'default',
      sendEnvelope,
      enableDraftStreaming: true,
      draftFlushIntervalMs: 0,
    });

    await expect(
      handler(
        createDispatch({
          envelope: {
            eventKind: 'message',
            sender: { id: 'user_1', isBot: false },
            peer: { id: '123', type: 'private' },
            message: { text: 'hi', threadId: undefined },
          },
        })
      )
    ).resolves.toBeUndefined();

    const clearCalls = sendEnvelope.mock.calls
      .map((call) => call[0] as any)
      .filter(
        (envelope) =>
          envelope?.message?.delivery?.mode === 'preview' &&
          envelope?.message?.delivery?.action === 'clear'
      );
    expect(clearCalls).toHaveLength(1);

    const finalFallbackCalls = sendEnvelope.mock.calls
      .map((call) => call[0] as any)
      .filter((envelope) => envelope?.message?.delivery === undefined);
    expect(finalFallbackCalls.length).toBeGreaterThan(0);
    expect(finalFallbackCalls[0]?.message?.text).toBe('hello world');
  });

  it('preview commit 失败时应回退到 final 发送，不中断主流程', async () => {
    runtimeMock.runChatTurn.mockResolvedValue(
      createRunResult({
        deltas: ['hello', ' world'],
      })
    );
    const sendEnvelope = vi.fn(async (envelope: any) => {
      if (
        envelope?.message?.delivery?.mode === 'preview' &&
        envelope?.message?.delivery?.action === 'commit'
      ) {
        throw new Error('preview commit failed');
      }
    });
    const handler = createTelegramInboundReplyHandler({
      accountId: 'default',
      sendEnvelope,
      enableDraftStreaming: true,
      draftFlushIntervalMs: 0,
    });

    await expect(
      handler(
        createDispatch({
          envelope: {
            eventKind: 'message',
            sender: { id: 'user_1', isBot: false },
            peer: { id: '123', type: 'private' },
            message: { text: 'hi', threadId: undefined },
          },
        })
      )
    ).resolves.toBeUndefined();

    const finalFallbackCalls = sendEnvelope.mock.calls
      .map((call) => call[0] as any)
      .filter((envelope) => envelope?.message?.delivery === undefined);
    expect(finalFallbackCalls.length).toBeGreaterThan(0);
    expect(finalFallbackCalls[0]?.message?.text).toBe('hello world');
  });

  it('当流式增量为空时回退 finalOutput', async () => {
    runtimeMock.runChatTurn.mockResolvedValue(
      createRunResult({
        deltas: [],
        finalOutput: 'fallback reply',
      })
    );
    const sendEnvelope = vi.fn(async () => undefined);
    const handler = createTelegramInboundReplyHandler({
      accountId: 'default',
      sendEnvelope,
    });

    await handler(createDispatch());

    expect(sendEnvelope).toHaveBeenCalledTimes(1);
    expect(sendEnvelope.mock.calls[0][0]).toMatchObject({
      message: {
        text: 'fallback reply',
      },
    });
  });
});

describe('createTelegramPairingReminderHandler', () => {
  it('发送失败时仅记录告警，不向上抛错', async () => {
    const sendEnvelope = vi.fn(async () => {
      throw new Error('send failed');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const handler = createTelegramPairingReminderHandler({
      accountId: 'default',
      sendEnvelope,
    });

    await expect(
      handler({
        id: 'pair_1',
        channel: 'telegram',
        accountId: 'default',
        senderId: 'sender_1',
        peerId: 'peer_1',
        code: '123456',
        status: 'pending',
        createdAt: '2026-03-03T12:00:00.000Z',
        expiresAt: '2026-03-03T12:15:00.000Z',
        lastSeenAt: '2026-03-03T12:01:00.000Z',
      })
    ).resolves.toBeUndefined();

    expect(sendEnvelope).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

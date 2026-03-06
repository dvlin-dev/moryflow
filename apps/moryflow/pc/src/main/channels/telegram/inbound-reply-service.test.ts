/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeMock = vi.hoisted(() => ({
  runChatTurn: vi.fn(),
}));

const agentRuntimeMock = vi.hoisted(() => ({
  createChatSession: vi.fn((sessionKey: string) => ({ sessionKey })),
}));

vi.mock('@moryflow/channels-telegram', async () => {
  const commands = await import('../../../../../../../packages/channels-telegram/src/commands.ts');
  return {
    parseTelegramCommand: commands.parseTelegramCommand,
  };
});

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

const createRunResultWithError = (input: { deltas: string[]; error: Error }) => {
  const stream = (async function* () {
    for (const delta of input.deltas) {
      yield {
        type: 'raw_model_stream_event',
        data: { deltaText: delta },
      };
    }
    throw input.error;
  })() as AsyncIterable<{
    type: string;
    data: { deltaText: string };
  }> & {
    completed: Promise<void>;
    finalOutput?: string;
  };

  // stream 迭代抛错后不会走 completed await，保持 resolve 避免测试出现未处理拒绝
  stream.completed = Promise.resolve();
  stream.finalOutput = undefined;

  return {
    result: stream,
  };
};

const createDispatch = (overrides?: Partial<Record<string, unknown>>) =>
  ({
    envelope: {
      eventId: 'default:1001',
      eventKind: 'message',
      sender: { id: 'sender_1', isBot: false },
      peer: { id: 'chat_1' },
      message: {
        text: 'hello',
        threadId: undefined,
      },
    },
    thread: {
      peerKey: 'peer_key',
      threadKey: 'thread_key',
    },
    ...overrides,
  }) as any;

describe('createTelegramInboundReplyHandler', () => {
  const resolveConversationId = vi.fn(async () => 'conversation_1');
  const createNewConversationId = vi.fn(async () => 'conversation_new_1');
  const syncConversationUiState = vi.fn(async () => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    resolveConversationId.mockResolvedValue('conversation_1');
    createNewConversationId.mockResolvedValue('conversation_new_1');
    syncConversationUiState.mockResolvedValue(undefined);
  });

  it('忽略 bot sender 入站消息', async () => {
    const sendEnvelope = vi.fn(async () => undefined);
    const handler = createTelegramInboundReplyHandler({
      accountId: 'default',
      sendEnvelope,
      resolveConversationId,
      createNewConversationId,
      syncConversationUiState,
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
      resolveConversationId,
      createNewConversationId,
      syncConversationUiState,
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
        chatId: 'conversation_1',
        input: 'User clicked callback: approve',
        mode: 'full_access',
      })
    );
    expect(agentRuntimeMock.createChatSession).toHaveBeenCalledWith('conversation_1');
    expect(sendEnvelope).toHaveBeenCalledTimes(2);
    expect(syncConversationUiState).toHaveBeenCalledWith('conversation_1');
    expect(sendEnvelope.mock.calls[0][0]).toMatchObject({
      channel: 'telegram',
      accountId: 'default',
      target: { chatId: 'chat_1', threadId: 12 },
      message: { format: 'text' },
    });
    expect((sendEnvelope.mock.calls[0][0] as any).message.text.length).toBe(3_800);
    expect((sendEnvelope.mock.calls[1][0] as any).message.text.length).toBe(205);
  });

  it('执行模型时应复用会话级 agent options，并保持 full_access', async () => {
    runtimeMock.runChatTurn.mockResolvedValue(
      createRunResult({
        deltas: ['ok'],
      })
    );
    const sendEnvelope = vi.fn(async () => undefined);
    const resolveAgentOptions = vi.fn(async () => ({
      preferredModelId: 'openai/gpt-5.2',
      thinking: { mode: 'level', level: 'high' },
      thinkingProfile: {
        supportsThinking: true,
        defaultLevel: 'off',
        levels: [
          { id: 'off', label: 'Off' },
          { id: 'high', label: 'High' },
        ],
      },
    }));
    const handler = createTelegramInboundReplyHandler({
      accountId: 'default',
      sendEnvelope,
      resolveConversationId,
      createNewConversationId,
      resolveAgentOptions,
      syncConversationUiState,
    });

    await handler(
      createDispatch({
        envelope: {
          eventKind: 'message',
          sender: { id: 'user_1', isBot: false },
          peer: { id: 'chat_1' },
          message: { text: 'hello', threadId: undefined },
        },
      })
    );

    expect(resolveAgentOptions).toHaveBeenCalledWith('conversation_1');
    expect(runtimeMock.runChatTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: 'conversation_1',
        preferredModelId: 'openai/gpt-5.2',
        thinking: { mode: 'level', level: 'high' },
        mode: 'full_access',
      })
    );
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
      resolveConversationId,
      createNewConversationId,
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

  it('应推送 TG 入站实时正文预览快照（用户输入 + 助手增量）', async () => {
    runtimeMock.runChatTurn.mockResolvedValue(
      createRunResult({
        deltas: ['hello', ' world'],
      })
    );
    const sendEnvelope = vi.fn(async () => undefined);
    const publishConversationPreview = vi.fn(async () => undefined);
    const handler = createTelegramInboundReplyHandler({
      accountId: 'default',
      sendEnvelope,
      resolveConversationId,
      createNewConversationId,
      syncConversationUiState,
      publishConversationPreview,
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

    expect(publishConversationPreview).toHaveBeenCalled();
    expect(publishConversationPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation_1',
        userInput: 'hi',
      })
    );
    expect(
      publishConversationPreview.mock.calls.some((call) => call[0]?.assistantText === 'hello world')
    ).toBe(true);
  });

  it('流式执行失败时应回刷持久化会话快照，避免 Chat 面板残留未持久化预览', async () => {
    const streamError = new Error('stream failed');
    runtimeMock.runChatTurn.mockResolvedValue(
      createRunResultWithError({
        deltas: ['hello'],
        error: streamError,
      })
    );
    const sendEnvelope = vi.fn(async () => undefined);
    const publishConversationPreview = vi.fn(async () => undefined);
    const handler = createTelegramInboundReplyHandler({
      accountId: 'default',
      sendEnvelope,
      resolveConversationId,
      createNewConversationId,
      syncConversationUiState,
      publishConversationPreview,
      enableDraftStreaming: true,
      draftFlushIntervalMs: 0,
    });

    await expect(handler(createDispatch())).rejects.toThrow('stream failed');

    expect(publishConversationPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation_1',
        assistantText: 'hello',
      })
    );
    expect(syncConversationUiState).toHaveBeenCalledWith('conversation_1');
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
      resolveConversationId,
      createNewConversationId,
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
      resolveConversationId,
      createNewConversationId,
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
      resolveConversationId,
      createNewConversationId,
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

  it('preview update 在网络慢时应合并后续增量，避免逐字阻塞', async () => {
    runtimeMock.runChatTurn.mockResolvedValue(
      createRunResult({
        deltas: ['a', 'b', 'c'],
      })
    );
    const sendEnvelope = vi.fn(async (envelope: any) => {
      if (
        envelope?.message?.delivery?.mode === 'preview' &&
        envelope?.message?.delivery?.action === 'update'
      ) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    });
    const handler = createTelegramInboundReplyHandler({
      accountId: 'default',
      sendEnvelope,
      resolveConversationId,
      createNewConversationId,
      syncConversationUiState,
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

    const previewUpdateCalls = sendEnvelope.mock.calls
      .map((call) => call[0] as any)
      .filter(
        (envelope) =>
          envelope?.message?.delivery?.mode === 'preview' &&
          envelope?.message?.delivery?.action === 'update'
      );
    expect(previewUpdateCalls.length).toBeLessThanOrEqual(2);
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
      resolveConversationId,
      createNewConversationId,
      syncConversationUiState,
    });

    await handler(createDispatch());

    expect(sendEnvelope).toHaveBeenCalledTimes(1);
    expect(sendEnvelope.mock.calls[0][0]).toMatchObject({
      message: {
        text: 'fallback reply',
      },
    });
  });

  it('private chat 收到 /start 时应确保会话可用并返回确认消息，不调用模型', async () => {
    const sendEnvelope = vi.fn(async () => undefined);
    const handler = createTelegramInboundReplyHandler({
      accountId: 'default',
      sendEnvelope,
      resolveConversationId,
      createNewConversationId,
      syncConversationUiState,
    });

    await handler(
      createDispatch({
        envelope: {
          eventKind: 'message',
          sender: { id: 'user_1', isBot: false },
          peer: { id: '123', type: 'private' },
          message: { text: '/start', threadId: undefined },
        },
      })
    );

    expect(resolveConversationId).toHaveBeenCalledTimes(1);
    expect(createNewConversationId).not.toHaveBeenCalled();
    expect(runtimeMock.runChatTurn).not.toHaveBeenCalled();
    expect(syncConversationUiState).toHaveBeenCalledWith('conversation_1');
    expect(sendEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({
          text: 'Conversation is ready. Send your next message to continue.',
        }),
      })
    );
  });

  it('private chat 收到 /new 时应创建新会话并返回确认消息，不调用模型', async () => {
    const sendEnvelope = vi.fn(async () => undefined);
    const handler = createTelegramInboundReplyHandler({
      accountId: 'default',
      sendEnvelope,
      resolveConversationId,
      createNewConversationId,
      syncConversationUiState,
    });

    await handler(
      createDispatch({
        envelope: {
          eventKind: 'message',
          sender: { id: 'user_1', isBot: false },
          peer: { id: '123', type: 'private' },
          message: { text: '/new', threadId: undefined },
        },
      })
    );

    expect(createNewConversationId).toHaveBeenCalledTimes(1);
    expect(resolveConversationId).not.toHaveBeenCalled();
    expect(runtimeMock.runChatTurn).not.toHaveBeenCalled();
    expect(syncConversationUiState).toHaveBeenCalledWith('conversation_new_1');
    expect(sendEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({
          text: 'Started a new conversation. Send your next message to continue.',
        }),
      })
    );
  });

  it('/new 确认消息发送失败后重试同一 update，不应重复创建新会话', async () => {
    const dispatch = createDispatch({
      envelope: {
        eventId: 'default:2002',
        eventKind: 'message',
        sender: { id: 'user_1', isBot: false },
        peer: { id: '123', type: 'private' },
        message: { text: '/new', threadId: undefined },
      },
    });
    const sendEnvelope = vi
      .fn()
      .mockRejectedValueOnce(new Error('send failed'))
      .mockResolvedValueOnce(undefined);
    const handler = createTelegramInboundReplyHandler({
      accountId: 'default',
      sendEnvelope,
      resolveConversationId,
      createNewConversationId,
    });

    await expect(handler(dispatch)).rejects.toThrow('send failed');
    await expect(handler(dispatch)).resolves.toBeUndefined();

    expect(createNewConversationId).toHaveBeenCalledTimes(1);
    expect(sendEnvelope).toHaveBeenCalledTimes(2);
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

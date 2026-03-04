/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const channelsTelegramMock = vi.hoisted(() => ({
  createTelegramRuntime: vi.fn(),
  parseTelegramAccountConfig: vi.fn(),
}));

const secretStoreMock = vi.hoisted(() => ({
  getTelegramBotToken: vi.fn(),
  getTelegramProxyUrl: vi.fn(),
  getTelegramWebhookSecret: vi.fn(),
}));

const sqliteStoreMock = vi.hoisted(() => ({
  getTelegramPersistenceStore: vi.fn(),
}));

const webhookIngressMock = vi.hoisted(() => ({
  startTelegramWebhookIngress: vi.fn(),
}));

const inboundReplyMock = vi.hoisted(() => ({
  createTelegramInboundReplyHandler: vi.fn(),
  createTelegramPairingReminderHandler: vi.fn(),
}));

const broadcastMock = vi.hoisted(() => ({
  broadcastSessionEvent: vi.fn(),
  broadcastMessageEvent: vi.fn(),
}));

const chatSessionStoreMock = vi.hoisted(() => ({
  create: vi.fn(() => ({ id: 'conversation_1' })),
  delete: vi.fn(() => undefined),
  getSummary: vi.fn(() => ({ id: 'conversation_1' })),
  getHistory: vi.fn(() => [
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: [{ type: 'output_text', text: 'world' }] },
  ]),
  getUiMessages: vi.fn(() => [
    {
      id: 'existing-user',
      role: 'user',
      parts: [{ type: 'text', text: 'hello' }],
    },
    {
      id: 'existing-assistant',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'world' },
        {
          type: 'tool-bash',
          toolCallId: 'call_1',
          command: 'ls',
          output: 'file-a.md',
          state: 'output-available',
        },
      ],
    },
  ]),
  updateSessionMeta: vi.fn(() => ({ id: 'conversation_1' })),
}));

const vaultMock = vi.hoisted(() => ({
  getStoredVault: vi.fn(async () => ({ path: '/tmp/vault' })),
}));

vi.mock('@moryflow/channels-telegram', () => ({
  createTelegramRuntime: channelsTelegramMock.createTelegramRuntime,
  parseTelegramAccountConfig: channelsTelegramMock.parseTelegramAccountConfig,
}));

vi.mock('./secret-store.js', () => ({
  getTelegramBotToken: secretStoreMock.getTelegramBotToken,
  getTelegramProxyUrl: secretStoreMock.getTelegramProxyUrl,
  getTelegramWebhookSecret: secretStoreMock.getTelegramWebhookSecret,
}));

vi.mock('./sqlite-store.js', () => ({
  getTelegramPersistenceStore: sqliteStoreMock.getTelegramPersistenceStore,
}));

vi.mock('./webhook-ingress.js', () => ({
  startTelegramWebhookIngress: webhookIngressMock.startTelegramWebhookIngress,
}));

vi.mock('./inbound-reply-service.js', () => ({
  createTelegramInboundReplyHandler: inboundReplyMock.createTelegramInboundReplyHandler,
  createTelegramPairingReminderHandler: inboundReplyMock.createTelegramPairingReminderHandler,
}));

vi.mock('../../chat-session-store/index.js', () => ({
  chatSessionStore: chatSessionStoreMock,
}));

vi.mock('../../chat/broadcast.js', () => ({
  broadcastSessionEvent: broadcastMock.broadcastSessionEvent,
  broadcastMessageEvent: broadcastMock.broadcastMessageEvent,
}));

vi.mock('../../vault.js', () => ({
  getStoredVault: vaultMock.getStoredVault,
}));

import { createTelegramRuntimeOrchestrator } from './runtime-orchestrator.js';

const createAccount = (overrides?: Partial<Record<string, unknown>>) => ({
  accountId: 'default',
  enabled: true,
  mode: 'polling',
  webhookUrl: 'https://public.example.com/telegram/webhook/default',
  webhookListenHost: '127.0.0.1',
  webhookListenPort: 8787,
  dmPolicy: 'pairing',
  allowFrom: [],
  groupPolicy: 'allowlist',
  groupAllowFrom: [],
  requireMentionByDefault: true,
  groups: {},
  pollingTimeoutSeconds: 25,
  pollingIdleDelayMs: 600,
  pollingMaxBatchSize: 100,
  pairingCodeTtlSeconds: 900,
  maxSendRetries: 3,
  proxyEnabled: false,
  enableDraftStreaming: true,
  draftFlushIntervalMs: 350,
  ...overrides,
});

const createRuntime = (overrides?: Partial<Record<string, unknown>>) => ({
  start: vi.fn(async () => undefined),
  stop: vi.fn(async () => undefined),
  send: vi.fn(async () => ({ ok: true, chatId: 'chat_1' })),
  getStatus: vi.fn(() => ({
    accountId: 'default',
    mode: 'polling',
    running: false,
  })),
  handleWebhookUpdate: vi.fn(async () => undefined),
  ...overrides,
});

describe('createTelegramRuntimeOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    secretStoreMock.getTelegramBotToken.mockResolvedValue('bot_token');
    secretStoreMock.getTelegramProxyUrl.mockResolvedValue(null);
    secretStoreMock.getTelegramWebhookSecret.mockResolvedValue('webhook_secret');

    sqliteStoreMock.getTelegramPersistenceStore.mockReturnValue({
      offsets: {},
      conversationBindings: {},
      sentMessages: {},
      pairing: {},
    });

    inboundReplyMock.createTelegramInboundReplyHandler.mockReturnValue(
      vi.fn(async () => undefined)
    );
    inboundReplyMock.createTelegramPairingReminderHandler.mockReturnValue(
      vi.fn(async () => undefined)
    );

    channelsTelegramMock.parseTelegramAccountConfig.mockImplementation((input) => ({
      accountId: input.accountId,
      botToken: input.botToken,
      mode: input.mode,
      webhook: input.webhook,
      polling: input.polling,
      policy: input.policy,
      pairingCodeTtlSeconds: input.pairingCodeTtlSeconds,
      maxSendRetries: input.maxSendRetries,
      proxy: input.proxy,
    }));

    channelsTelegramMock.createTelegramRuntime.mockImplementation(() => createRuntime());

    webhookIngressMock.startTelegramWebhookIngress.mockImplementation(async () => ({
      stop: vi.fn(async () => undefined),
    }));
  });

  it('enabled 且 token 缺失时不会启动 runtime，并返回 Missing token 状态', async () => {
    secretStoreMock.getTelegramBotToken.mockResolvedValue(null);
    const orchestrator = createTelegramRuntimeOrchestrator();

    await orchestrator.applyAccounts({
      default: createAccount({ mode: 'polling', enabled: true }),
    } as any);

    const status = orchestrator.getStatusSnapshot().accounts.default;
    expect(status).toMatchObject({
      accountId: 'default',
      running: false,
      enabled: true,
      hasBotToken: false,
      lastError: 'Bot token is not configured.',
    });
    expect(channelsTelegramMock.createTelegramRuntime).not.toHaveBeenCalled();
    expect(webhookIngressMock.startTelegramWebhookIngress).not.toHaveBeenCalled();
  });

  it('创建 inbound handler 时应注入 draft streaming 配置', async () => {
    const orchestrator = createTelegramRuntimeOrchestrator();

    await orchestrator.applyAccounts({
      default: createAccount({
        mode: 'polling',
        enableDraftStreaming: false,
        draftFlushIntervalMs: 900,
      }),
    } as any);

    expect(inboundReplyMock.createTelegramInboundReplyHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'default',
        enableDraftStreaming: false,
        draftFlushIntervalMs: 900,
        publishConversationPreview: expect.any(Function),
      })
    );
  });

  it('inbound 会话同步回调应回写 uiMessages 并广播 updated 事件', async () => {
    const orchestrator = createTelegramRuntimeOrchestrator();

    await orchestrator.applyAccounts({
      default: createAccount({
        mode: 'polling',
      }),
    } as any);

    const inboundArg = inboundReplyMock.createTelegramInboundReplyHandler.mock.calls[0][0] as {
      syncConversationUiState: (conversationId: string) => Promise<void>;
    };
    await inboundArg.syncConversationUiState('conversation_1');

    expect(chatSessionStoreMock.getHistory).toHaveBeenCalledWith('conversation_1');
    expect(chatSessionStoreMock.updateSessionMeta).toHaveBeenCalledWith(
      'conversation_1',
      expect.objectContaining({
        uiMessages: expect.any(Array),
      })
    );
    expect(broadcastMock.broadcastSessionEvent).toHaveBeenCalledWith({
      type: 'updated',
      session: { id: 'conversation_1' },
    });
    expect(broadcastMock.broadcastMessageEvent).toHaveBeenCalledWith({
      type: 'snapshot',
      sessionId: 'conversation_1',
      messages: expect.any(Array),
      persisted: true,
    });
  });

  it('inbound 会话同步时应保留既有富文本 parts（tool/attachment 等）', async () => {
    const orchestrator = createTelegramRuntimeOrchestrator();

    await orchestrator.applyAccounts({
      default: createAccount({
        mode: 'polling',
      }),
    } as any);

    const inboundArg = inboundReplyMock.createTelegramInboundReplyHandler.mock.calls[0][0] as {
      syncConversationUiState: (conversationId: string) => Promise<void>;
    };
    await inboundArg.syncConversationUiState('conversation_1');

    const updateCall = chatSessionStoreMock.updateSessionMeta.mock.calls.find(
      ([sessionId]) => sessionId === 'conversation_1'
    );
    const mergedMessages = updateCall?.[1]?.uiMessages as any[] | undefined;
    expect(Array.isArray(mergedMessages)).toBe(true);
    expect(mergedMessages?.[1]?.parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'tool-bash',
          toolCallId: 'call_1',
        }),
      ])
    );
  });

  it('开启 proxy 时应读取 keytar 并注入 runtime 配置', async () => {
    secretStoreMock.getTelegramProxyUrl.mockResolvedValue('http://127.0.0.1:6152');
    const orchestrator = createTelegramRuntimeOrchestrator();

    await orchestrator.applyAccounts({
      default: createAccount({
        mode: 'polling',
        proxyEnabled: true,
      }),
    } as any);

    expect(secretStoreMock.getTelegramProxyUrl).toHaveBeenCalledWith('default');
    expect(channelsTelegramMock.parseTelegramAccountConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'default',
        proxy: {
          enabled: true,
          url: 'http://127.0.0.1:6152',
        },
      })
    );
  });

  it('webhook 模式使用本地监听参数，并将 webhook URL 解析为 path', async () => {
    const runtime = createRuntime();
    channelsTelegramMock.createTelegramRuntime.mockReturnValue(runtime);
    const orchestrator = createTelegramRuntimeOrchestrator();

    await orchestrator.applyAccounts({
      default: createAccount({
        mode: 'webhook',
        webhookUrl: 'https://public.example.com/telegram/webhook/default',
        webhookListenHost: '127.0.0.1',
        webhookListenPort: 8787,
      }),
    } as any);

    expect(webhookIngressMock.startTelegramWebhookIngress).toHaveBeenCalledTimes(1);
    expect(webhookIngressMock.startTelegramWebhookIngress).toHaveBeenCalledWith(
      expect.objectContaining({
        listenHost: '127.0.0.1',
        listenPort: 8787,
        routes: [
          expect.objectContaining({
            accountId: 'default',
            webhookPath: '/telegram/webhook/default',
            webhookSecret: 'webhook_secret',
          }),
        ],
      })
    );

    const ingressArg = webhookIngressMock.startTelegramWebhookIngress.mock.calls[0][0];
    await ingressArg.routes[0].onUpdate({ update_id: 1 });
    expect(runtime.handleWebhookUpdate).toHaveBeenCalledWith({ update_id: 1 });
  });

  it('同 host/port 的多 webhook 账号应复用单一 ingress 并按路径路由', async () => {
    const runtimeA = createRuntime();
    const runtimeB = createRuntime();
    channelsTelegramMock.createTelegramRuntime
      .mockReturnValueOnce(runtimeA)
      .mockReturnValueOnce(runtimeB);

    const orchestrator = createTelegramRuntimeOrchestrator();

    await orchestrator.applyAccounts({
      a: createAccount({
        accountId: 'a',
        mode: 'webhook',
        webhookUrl: 'https://public.example.com/telegram/webhook/a',
        webhookListenHost: '127.0.0.1',
        webhookListenPort: 8787,
      }),
      b: createAccount({
        accountId: 'b',
        mode: 'webhook',
        webhookUrl: 'https://public.example.com/telegram/webhook/b',
        webhookListenHost: '127.0.0.1',
        webhookListenPort: 8787,
      }),
    } as any);

    expect(webhookIngressMock.startTelegramWebhookIngress).toHaveBeenCalledTimes(1);
    const ingressInput = webhookIngressMock.startTelegramWebhookIngress.mock.calls[0][0];
    expect(ingressInput.listenHost).toBe('127.0.0.1');
    expect(ingressInput.listenPort).toBe(8787);
    expect(ingressInput.routes).toHaveLength(2);
    expect(ingressInput.routes[0]).toMatchObject({
      accountId: 'a',
      webhookPath: '/telegram/webhook/a',
    });
    expect(ingressInput.routes[1]).toMatchObject({
      accountId: 'b',
      webhookPath: '/telegram/webhook/b',
    });

    await ingressInput.routes[0].onUpdate({ update_id: 11 });
    await ingressInput.routes[1].onUpdate({ update_id: 22 });
    expect(runtimeA.handleWebhookUpdate).toHaveBeenCalledWith({ update_id: 11 });
    expect(runtimeB.handleWebhookUpdate).toHaveBeenCalledWith({ update_id: 22 });
  });

  it('runtime start 失败时不会创建 ingress，并写入错误状态', async () => {
    const runtime = createRuntime({
      start: vi.fn(async () => {
        throw new Error('start failed');
      }),
    });
    channelsTelegramMock.createTelegramRuntime.mockReturnValue(runtime);

    const orchestrator = createTelegramRuntimeOrchestrator();

    await orchestrator.applyAccounts({
      default: createAccount({
        mode: 'webhook',
      }),
    } as any);

    expect(webhookIngressMock.startTelegramWebhookIngress).not.toHaveBeenCalled();
    expect(orchestrator.getStatusSnapshot().accounts.default).toMatchObject({
      accountId: 'default',
      running: false,
      enabled: true,
      hasBotToken: true,
      lastError: 'start failed',
    });
  });

  it('共享 ingress 启动失败时会回收对应 runtime 并写入错误状态', async () => {
    const runtime = createRuntime();
    channelsTelegramMock.createTelegramRuntime.mockReturnValue(runtime);
    webhookIngressMock.startTelegramWebhookIngress.mockRejectedValue(new Error('EADDRINUSE'));

    const orchestrator = createTelegramRuntimeOrchestrator();

    await orchestrator.applyAccounts({
      default: createAccount({
        mode: 'webhook',
      }),
    } as any);

    expect(runtime.start).toHaveBeenCalledTimes(1);
    expect(runtime.stop).toHaveBeenCalledTimes(1);
    expect(orchestrator.getStatusSnapshot().accounts.default).toMatchObject({
      accountId: 'default',
      running: false,
      enabled: true,
      hasBotToken: true,
      lastError: 'EADDRINUSE',
    });
  });

  it('runtime 已上报停止状态时不应被启动后置逻辑覆盖为 running=true', async () => {
    let onStatusChange: ((status: any) => void) | undefined;
    const runtime = createRuntime({
      start: vi.fn(async () => {
        onStatusChange?.({
          accountId: 'default',
          mode: 'polling',
          running: false,
          lastError: 'Unauthorized',
        });
      }),
    });
    channelsTelegramMock.createTelegramRuntime.mockImplementation((input: any) => {
      onStatusChange = input.events.onStatusChange;
      return runtime;
    });

    const orchestrator = createTelegramRuntimeOrchestrator();
    await orchestrator.applyAccounts({
      default: createAccount({ mode: 'polling' }),
    } as any);

    expect(orchestrator.getStatusSnapshot().accounts.default).toMatchObject({
      accountId: 'default',
      running: false,
      lastError: 'Unauthorized',
    });
  });

  it('shutdown 会停止已启动 runtime 与 webhook ingress', async () => {
    const runtime = createRuntime();
    const ingressHandle = {
      stop: vi.fn(async () => undefined),
    };
    channelsTelegramMock.createTelegramRuntime.mockReturnValue(runtime);
    webhookIngressMock.startTelegramWebhookIngress.mockResolvedValue(ingressHandle);

    const orchestrator = createTelegramRuntimeOrchestrator();

    await orchestrator.applyAccounts({
      default: createAccount({
        mode: 'webhook',
      }),
    } as any);

    await orchestrator.shutdown();

    expect(runtime.stop).toHaveBeenCalledTimes(1);
    expect(ingressHandle.stop).toHaveBeenCalledTimes(1);
  });

  it('subscribeStatus 会立即推送当前快照，取消订阅后不再收到更新', async () => {
    secretStoreMock.getTelegramBotToken.mockResolvedValue(null);
    const orchestrator = createTelegramRuntimeOrchestrator();
    const snapshots: Array<Record<string, unknown>> = [];

    const unsubscribe = orchestrator.subscribeStatus((snapshot) => {
      snapshots.push(snapshot.accounts);
    });
    unsubscribe();

    await orchestrator.applyAccounts({
      default: createAccount({ enabled: true }),
    } as any);

    expect(snapshots).toEqual([{}]);
  });
});

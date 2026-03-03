/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const channelsTelegramMock = vi.hoisted(() => ({
  createTelegramRuntime: vi.fn(),
  parseTelegramAccountConfig: vi.fn(),
}));

const secretStoreMock = vi.hoisted(() => ({
  getTelegramBotToken: vi.fn(),
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

vi.mock('@moryflow/channels-telegram', () => ({
  createTelegramRuntime: channelsTelegramMock.createTelegramRuntime,
  parseTelegramAccountConfig: channelsTelegramMock.parseTelegramAccountConfig,
}));

vi.mock('./secret-store.js', () => ({
  getTelegramBotToken: secretStoreMock.getTelegramBotToken,
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
    secretStoreMock.getTelegramWebhookSecret.mockResolvedValue('webhook_secret');

    sqliteStoreMock.getTelegramPersistenceStore.mockReturnValue({
      offsets: {},
      sessions: {},
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

    expect(webhookIngressMock.startTelegramWebhookIngress).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'default',
        webhookPath: '/telegram/webhook/default',
        webhookSecret: 'webhook_secret',
        listenHost: '127.0.0.1',
        listenPort: 8787,
      })
    );

    const ingressArg = webhookIngressMock.startTelegramWebhookIngress.mock.calls[0][0];
    await ingressArg.onUpdate({ update_id: 1 });
    expect(runtime.handleWebhookUpdate).toHaveBeenCalledWith({ update_id: 1 });
  });

  it('runtime start 失败时会回收 ingress 并写入错误状态', async () => {
    const runtime = createRuntime({
      start: vi.fn(async () => {
        throw new Error('start failed');
      }),
    });
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

    expect(ingressHandle.stop).toHaveBeenCalledTimes(1);
    expect(orchestrator.getStatusSnapshot().accounts.default).toMatchObject({
      accountId: 'default',
      running: false,
      enabled: true,
      hasBotToken: true,
      lastError: 'start failed',
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

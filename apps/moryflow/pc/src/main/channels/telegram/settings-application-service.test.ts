/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const secretStoreMock = vi.hoisted(() => ({
  clearTelegramBotToken: vi.fn(),
  clearTelegramProxyUrl: vi.fn(),
  clearTelegramWebhookSecret: vi.fn(),
  getTelegramBotToken: vi.fn(),
  getTelegramProxyUrl: vi.fn(),
  getTelegramWebhookSecret: vi.fn(),
  isTelegramSecretStorageAvailable: vi.fn(),
  setTelegramBotToken: vi.fn(),
  setTelegramProxyUrl: vi.fn(),
  setTelegramWebhookSecret: vi.fn(),
}));

const settingsStoreMock = vi.hoisted(() => ({
  getTelegramSettingsStore: vi.fn(),
  updateTelegramSettingsStore: vi.fn(),
}));

const nodeFetchMock = vi.hoisted(() => ({
  default: vi.fn(),
}));

const proxyAgentMock = vi.hoisted(() => ({
  calls: [] as Array<{ getProxyForUrl?: () => string }>,
  nextError: null as Error | null,
}));

vi.mock('./secret-store.js', () => ({
  clearTelegramBotToken: secretStoreMock.clearTelegramBotToken,
  clearTelegramProxyUrl: secretStoreMock.clearTelegramProxyUrl,
  clearTelegramWebhookSecret: secretStoreMock.clearTelegramWebhookSecret,
  getTelegramBotToken: secretStoreMock.getTelegramBotToken,
  getTelegramProxyUrl: secretStoreMock.getTelegramProxyUrl,
  getTelegramWebhookSecret: secretStoreMock.getTelegramWebhookSecret,
  isTelegramSecretStorageAvailable: secretStoreMock.isTelegramSecretStorageAvailable,
  setTelegramBotToken: secretStoreMock.setTelegramBotToken,
  setTelegramProxyUrl: secretStoreMock.setTelegramProxyUrl,
  setTelegramWebhookSecret: secretStoreMock.setTelegramWebhookSecret,
}));

vi.mock('./settings-store.js', () => ({
  getTelegramSettingsStore: settingsStoreMock.getTelegramSettingsStore,
  updateTelegramSettingsStore: settingsStoreMock.updateTelegramSettingsStore,
}));

vi.mock('node-fetch', () => ({
  default: nodeFetchMock.default,
}));

vi.mock('proxy-agent', () => ({
  ProxyAgent: class {
    destroy = vi.fn();

    constructor(options: { getProxyForUrl?: () => string }) {
      if (proxyAgentMock.nextError) {
        const error = proxyAgentMock.nextError;
        proxyAgentMock.nextError = null;
        throw error;
      }
      proxyAgentMock.calls.push(options);
    }
  },
}));

import { createTelegramSettingsApplicationService } from './settings-application-service.js';

const createAccount = (overrides?: Partial<Record<string, unknown>>) => ({
  accountId: 'default',
  enabled: true,
  mode: 'polling',
  proxyEnabled: false,
  webhookUrl: '',
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
  enableDraftStreaming: true,
  draftFlushIntervalMs: 350,
  ...overrides,
});

describe('createTelegramSettingsApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    settingsStoreMock.getTelegramSettingsStore.mockReturnValue({
      defaultAccountId: 'default',
      accounts: {
        default: createAccount(),
      },
    });
    settingsStoreMock.updateTelegramSettingsStore.mockImplementation((payload) => ({
      defaultAccountId: 'default',
      accounts: {
        default: createAccount(payload.account as Record<string, unknown>),
      },
    }));

    secretStoreMock.isTelegramSecretStorageAvailable.mockResolvedValue(true);
    secretStoreMock.getTelegramBotToken.mockResolvedValue(null);
    secretStoreMock.getTelegramProxyUrl.mockResolvedValue(null);
    secretStoreMock.getTelegramWebhookSecret.mockResolvedValue(null);
    secretStoreMock.setTelegramBotToken.mockResolvedValue(undefined);
    secretStoreMock.setTelegramProxyUrl.mockResolvedValue(undefined);
    secretStoreMock.setTelegramWebhookSecret.mockResolvedValue(undefined);
    secretStoreMock.clearTelegramBotToken.mockResolvedValue(undefined);
    secretStoreMock.clearTelegramProxyUrl.mockResolvedValue(undefined);
    secretStoreMock.clearTelegramWebhookSecret.mockResolvedValue(undefined);

    nodeFetchMock.default.mockResolvedValue({
      ok: true,
      status: 200,
    });
    proxyAgentMock.calls = [];
    proxyAgentMock.nextError = null;
  });

  it('透传 secure storage 可用性', async () => {
    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts: vi.fn(async () => undefined) },
    });

    await expect(service.isSecretStorageAvailable()).resolves.toBe(true);
    expect(secretStoreMock.isTelegramSecretStorageAvailable).toHaveBeenCalledTimes(1);
  });

  it('getSettings 返回快照并注入 hasBotToken/hasWebhookSecret', async () => {
    secretStoreMock.getTelegramBotToken.mockResolvedValue('bot_token');
    secretStoreMock.getTelegramWebhookSecret.mockResolvedValue(null);

    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts: vi.fn(async () => undefined) },
    });

    const snapshot = await service.getSettings();

    expect(snapshot.defaultAccountId).toBe('default');
    expect(snapshot.accounts.default.hasBotToken).toBe(true);
    expect(snapshot.accounts.default.hasWebhookSecret).toBe(false);
  });

  it('getSettings 返回快照并注入 hasProxyUrl', async () => {
    secretStoreMock.getTelegramProxyUrl.mockResolvedValue('http://127.0.0.1:6152');

    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts: vi.fn(async () => undefined) },
    });

    const snapshot = await service.getSettings();
    expect(snapshot.accounts.default.hasProxyUrl).toBe(true);
  });

  it('getSettings 返回快照并注入 botTokenEcho/proxyUrl 预填值', async () => {
    secretStoreMock.getTelegramBotToken.mockResolvedValue('123456:AA_test_token');
    secretStoreMock.getTelegramProxyUrl.mockResolvedValue('http://127.0.0.1:6152');

    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts: vi.fn(async () => undefined) },
    });

    const snapshot = await service.getSettings();
    expect(snapshot.accounts.default).toMatchObject({
      botTokenEcho: expect.stringMatching(/^mftg:v1:/),
      proxyUrl: 'http://127.0.0.1:6152',
    });
    expect(snapshot.accounts.default.botToken).toBeUndefined();
  });

  it('updateSettings 收到 botTokenEcho 时不应重复写入 keytar', async () => {
    const applyAccounts = vi.fn(async () => undefined);
    secretStoreMock.getTelegramBotToken.mockResolvedValue('123456:AA_test_token');

    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts },
    });

    const snapshot = await service.getSettings();
    const botTokenEcho = snapshot.accounts.default.botTokenEcho;
    expect(typeof botTokenEcho).toBe('string');

    await service.updateSettings({
      account: {
        accountId: 'default',
        botToken: botTokenEcho,
      },
    });

    expect(secretStoreMock.setTelegramBotToken).not.toHaveBeenCalled();
    expect(secretStoreMock.clearTelegramBotToken).not.toHaveBeenCalled();
    expect(applyAccounts).toHaveBeenCalledTimes(1);
  });

  it('updateSettings 保存凭据并同步 runtime', async () => {
    const applyAccounts = vi.fn(async () => undefined);
    secretStoreMock.getTelegramBotToken.mockResolvedValue('stored_bot');
    secretStoreMock.getTelegramWebhookSecret.mockResolvedValue('stored_secret');

    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts },
    });

    await service.updateSettings({
      account: {
        accountId: 'default',
        botToken: '  bot_1  ',
        webhookSecret: '  sec_1  ',
      },
    });

    expect(secretStoreMock.setTelegramBotToken).toHaveBeenCalledWith('default', 'bot_1');
    expect(secretStoreMock.setTelegramWebhookSecret).toHaveBeenCalledWith('default', 'sec_1');
    expect(applyAccounts).toHaveBeenCalledTimes(1);
    expect(secretStoreMock.clearTelegramBotToken).not.toHaveBeenCalled();
    expect(secretStoreMock.clearTelegramWebhookSecret).not.toHaveBeenCalled();
  });

  it('updateSettings 支持清理已存凭据', async () => {
    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts: vi.fn(async () => undefined) },
    });

    await service.updateSettings({
      account: {
        accountId: 'default',
        botToken: null,
        webhookSecret: null,
        proxyUrl: null,
      },
    } as any);

    expect(secretStoreMock.clearTelegramBotToken).toHaveBeenCalledWith('default');
    expect(secretStoreMock.clearTelegramWebhookSecret).toHaveBeenCalledWith('default');
    expect(secretStoreMock.clearTelegramProxyUrl).toHaveBeenCalledWith('default');
    expect(secretStoreMock.setTelegramBotToken).not.toHaveBeenCalled();
    expect(secretStoreMock.setTelegramProxyUrl).not.toHaveBeenCalled();
    expect(secretStoreMock.setTelegramWebhookSecret).not.toHaveBeenCalled();
  });

  it('updateSettings 保存 proxy URL 到 keytar 并透传 proxyEnabled 到 runtime', async () => {
    const applyAccounts = vi.fn(async () => undefined);
    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts },
    });

    await service.updateSettings({
      account: {
        accountId: 'default',
        proxyEnabled: true,
        proxyUrl: '  http://127.0.0.1:6152  ',
      },
    } as any);

    expect(secretStoreMock.setTelegramProxyUrl).toHaveBeenCalledWith(
      'default',
      'http://127.0.0.1:6152'
    );
    expect(applyAccounts).toHaveBeenCalledWith(
      expect.objectContaining({
        default: expect.objectContaining({
          proxyEnabled: true,
        }),
      })
    );
  });

  it('updateSettings 应透传 draft streaming 字段到 runtime 同步', async () => {
    const applyAccounts = vi.fn(async () => undefined);
    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts },
    });

    await service.updateSettings({
      account: {
        accountId: 'default',
        enableDraftStreaming: false,
        draftFlushIntervalMs: 900,
      },
    });

    expect(applyAccounts).toHaveBeenCalledTimes(1);
    expect(applyAccounts).toHaveBeenCalledWith(
      expect.objectContaining({
        default: expect.objectContaining({
          enableDraftStreaming: false,
          draftFlushIntervalMs: 900,
        }),
      })
    );
  });

  it('updateSettings 应使用归一化 accountId 写入 secrets', async () => {
    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts: vi.fn(async () => undefined) },
    });

    await service.updateSettings({
      account: {
        accountId: '  default  ',
        botToken: '  bot_2  ',
        webhookSecret: '  sec_2  ',
      },
    });

    expect(secretStoreMock.setTelegramBotToken).toHaveBeenCalledWith('default', 'bot_2');
    expect(secretStoreMock.setTelegramWebhookSecret).toHaveBeenCalledWith('default', 'sec_2');
    expect(settingsStoreMock.updateTelegramSettingsStore).toHaveBeenCalledWith(
      expect.objectContaining({
        account: expect.objectContaining({
          accountId: 'default',
        }),
      })
    );
  });

  it('accountId 为空白时应在写入 secrets 前失败', async () => {
    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts: vi.fn(async () => undefined) },
    });

    await expect(
      service.updateSettings({
        account: {
          accountId: '   ',
          botToken: 'bot_3',
        },
      })
    ).rejects.toThrow('accountId is required');

    expect(secretStoreMock.setTelegramBotToken).not.toHaveBeenCalled();
    expect(secretStoreMock.setTelegramProxyUrl).not.toHaveBeenCalled();
    expect(secretStoreMock.setTelegramWebhookSecret).not.toHaveBeenCalled();
    expect(settingsStoreMock.updateTelegramSettingsStore).not.toHaveBeenCalled();
  });

  it('testProxyConnection 应支持 socks5 并返回结构化结果', async () => {
    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts: vi.fn(async () => undefined) },
    });

    const result = await service.testProxyConnection({
      accountId: 'default',
      proxyEnabled: true,
      proxyUrl: 'socks5://127.0.0.1:1080',
    });

    expect(result).toMatchObject({
      ok: true,
      statusCode: 200,
      message: 'Proxy connection to Telegram API succeeded.',
    });
    const proxyAgentInput = proxyAgentMock.calls[0];
    expect(typeof proxyAgentInput?.getProxyForUrl).toBe('function');
    expect(proxyAgentInput?.getProxyForUrl?.()).toBe('socks5://127.0.0.1:1080');
    expect(nodeFetchMock.default).toHaveBeenCalledTimes(1);
  });

  it('testProxyConnection 代理构造失败时应返回结构化失败而不是抛错', async () => {
    proxyAgentMock.nextError = new Error('proxy init failed');

    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts: vi.fn(async () => undefined) },
    });

    await expect(
      service.testProxyConnection({
        accountId: 'default',
        proxyEnabled: true,
        proxyUrl: 'http://127.0.0.1:6152',
      })
    ).resolves.toMatchObject({
      ok: false,
      message: expect.stringContaining('proxy init failed'),
    });
  });

  it('testProxyConnection 收到非 2xx 响应时也应视为网络可达', async () => {
    nodeFetchMock.default.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts: vi.fn(async () => undefined) },
    });

    await expect(
      service.testProxyConnection({
        accountId: 'default',
        proxyEnabled: true,
        proxyUrl: 'http://127.0.0.1:6152',
      })
    ).resolves.toMatchObject({
      ok: true,
      statusCode: 404,
      message: 'Proxy connection to Telegram API succeeded.',
    });
  });

  it('detectProxySuggestion 直连可达时应建议关闭代理', async () => {
    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts: vi.fn(async () => undefined) },
      resolveSystemProxyCandidates: vi.fn(async () => ['http://127.0.0.1:6152']),
      env: {
        HTTPS_PROXY: 'socks5://127.0.0.1:7890',
      },
    });

    const result = await service.detectProxySuggestion({
      accountId: 'default',
    });

    expect(result).toMatchObject({
      proxyEnabled: false,
      reason: 'direct_reachable',
      message: 'Telegram API is reachable without proxy.',
      candidates: ['http://127.0.0.1:6152', 'socks5://127.0.0.1:7890'],
    });
    expect(nodeFetchMock.default).toHaveBeenCalledTimes(1);
    expect(proxyAgentMock.calls).toHaveLength(0);
  });

  it('detectProxySuggestion 直连失败后命中可达候选时应返回代理建议', async () => {
    nodeFetchMock.default
      .mockRejectedValueOnce(new Error('direct timeout'))
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts: vi.fn(async () => undefined) },
      resolveSystemProxyCandidates: vi.fn(async () => ['http://127.0.0.1:6152']),
      env: {},
    });

    const result = await service.detectProxySuggestion({
      accountId: 'default',
    });

    expect(result).toMatchObject({
      proxyEnabled: true,
      proxyUrl: 'http://127.0.0.1:6152',
      reason: 'proxy_candidate_reachable',
      message: 'Detected a working proxy for Telegram API.',
      candidates: ['http://127.0.0.1:6152'],
    });
    expect(nodeFetchMock.default).toHaveBeenCalledTimes(2);
    expect(proxyAgentMock.calls).toHaveLength(1);
    expect(proxyAgentMock.calls[0]?.getProxyForUrl?.()).toBe('http://127.0.0.1:6152');
  });

  it('detectProxySuggestion 无可用候选时应返回 no_proxy_candidate', async () => {
    nodeFetchMock.default.mockRejectedValueOnce(new Error('direct timeout'));

    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts: vi.fn(async () => undefined) },
      resolveSystemProxyCandidates: vi.fn(async () => []),
      env: {},
    });

    const result = await service.detectProxySuggestion({
      accountId: 'default',
    });

    expect(result).toMatchObject({
      proxyEnabled: false,
      reason: 'no_proxy_candidate',
      candidates: [],
    });
    expect(nodeFetchMock.default).toHaveBeenCalledTimes(1);
  });

  it('detectProxySuggestion 候选全部不可达时应返回 proxy_candidate_unreachable', async () => {
    nodeFetchMock.default
      .mockRejectedValueOnce(new Error('direct timeout'))
      .mockRejectedValueOnce(new Error('proxy timeout'));

    const service = createTelegramSettingsApplicationService({
      runtimeSync: { applyAccounts: vi.fn(async () => undefined) },
      resolveSystemProxyCandidates: vi.fn(async () => []),
      env: {
        HTTPS_PROXY: 'http://127.0.0.1:6152',
      },
    });

    const result = await service.detectProxySuggestion({
      accountId: 'default',
    });

    expect(result).toMatchObject({
      proxyEnabled: false,
      reason: 'proxy_candidate_unreachable',
      candidates: ['http://127.0.0.1:6152'],
    });
    expect(result.message).toContain('Proxy connection failed');
    expect(nodeFetchMock.default).toHaveBeenCalledTimes(2);
    expect(proxyAgentMock.calls).toHaveLength(1);
  });
});

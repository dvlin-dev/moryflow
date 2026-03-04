/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const secretStoreMock = vi.hoisted(() => ({
  clearTelegramBotToken: vi.fn(),
  clearTelegramWebhookSecret: vi.fn(),
  getTelegramBotToken: vi.fn(),
  getTelegramWebhookSecret: vi.fn(),
  isTelegramSecretStorageAvailable: vi.fn(),
  setTelegramBotToken: vi.fn(),
  setTelegramWebhookSecret: vi.fn(),
}));

const settingsStoreMock = vi.hoisted(() => ({
  getTelegramSettingsStore: vi.fn(),
  updateTelegramSettingsStore: vi.fn(),
}));

vi.mock('./secret-store.js', () => ({
  clearTelegramBotToken: secretStoreMock.clearTelegramBotToken,
  clearTelegramWebhookSecret: secretStoreMock.clearTelegramWebhookSecret,
  getTelegramBotToken: secretStoreMock.getTelegramBotToken,
  getTelegramWebhookSecret: secretStoreMock.getTelegramWebhookSecret,
  isTelegramSecretStorageAvailable: secretStoreMock.isTelegramSecretStorageAvailable,
  setTelegramBotToken: secretStoreMock.setTelegramBotToken,
  setTelegramWebhookSecret: secretStoreMock.setTelegramWebhookSecret,
}));

vi.mock('./settings-store.js', () => ({
  getTelegramSettingsStore: settingsStoreMock.getTelegramSettingsStore,
  updateTelegramSettingsStore: settingsStoreMock.updateTelegramSettingsStore,
}));

import { createTelegramSettingsApplicationService } from './settings-application-service.js';

const createAccount = (overrides?: Partial<Record<string, unknown>>) => ({
  accountId: 'default',
  enabled: true,
  mode: 'polling',
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
    secretStoreMock.getTelegramWebhookSecret.mockResolvedValue(null);
    secretStoreMock.setTelegramBotToken.mockResolvedValue(undefined);
    secretStoreMock.setTelegramWebhookSecret.mockResolvedValue(undefined);
    secretStoreMock.clearTelegramBotToken.mockResolvedValue(undefined);
    secretStoreMock.clearTelegramWebhookSecret.mockResolvedValue(undefined);
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
      },
    });

    expect(secretStoreMock.clearTelegramBotToken).toHaveBeenCalledWith('default');
    expect(secretStoreMock.clearTelegramWebhookSecret).toHaveBeenCalledWith('default');
    expect(secretStoreMock.setTelegramBotToken).not.toHaveBeenCalled();
    expect(secretStoreMock.setTelegramWebhookSecret).not.toHaveBeenCalled();
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
    expect(secretStoreMock.setTelegramWebhookSecret).not.toHaveBeenCalled();
    expect(settingsStoreMock.updateTelegramSettingsStore).not.toHaveBeenCalled();
  });
});

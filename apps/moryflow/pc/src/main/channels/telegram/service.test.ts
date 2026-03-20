/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeOrchestratorMock = vi.hoisted(() => ({
  applyAccounts: vi.fn(),
  shutdown: vi.fn(),
  getStatusSnapshot: vi.fn(),
  subscribeStatus: vi.fn(),
  sendEnvelope: vi.fn(),
  ensureReplyConversation: vi.fn(),
}));

const settingsStoreMock = vi.hoisted(() => ({
  getTelegramSettingsStore: vi.fn(),
}));

const settingsApplicationServiceMock = vi.hoisted(() => ({
  createTelegramSettingsApplicationService: vi.fn(),
}));

const pairingAdminServiceMock = vi.hoisted(() => ({
  createTelegramPairingAdminService: vi.fn(),
}));

const persistenceStoreMock = vi.hoisted(() => ({
  getTelegramPersistenceStore: vi.fn(),
}));

vi.mock('./runtime-orchestrator.js', () => ({
  createTelegramRuntimeOrchestrator: () => runtimeOrchestratorMock,
}));

vi.mock('./settings-store.js', () => ({
  getTelegramSettingsStore: settingsStoreMock.getTelegramSettingsStore,
}));

vi.mock('./settings-application-service.js', () => ({
  createTelegramSettingsApplicationService:
    settingsApplicationServiceMock.createTelegramSettingsApplicationService,
}));

vi.mock('./pairing-admin-service.js', () => ({
  createTelegramPairingAdminService: pairingAdminServiceMock.createTelegramPairingAdminService,
}));

vi.mock('./persistence-store.js', () => ({
  getTelegramPersistenceStore: persistenceStoreMock.getTelegramPersistenceStore,
}));

const loadService = async () => {
  const mod = await import('./service.js');
  return mod.telegramChannelService;
};

describe('telegramChannelService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    settingsStoreMock.getTelegramSettingsStore.mockReturnValue({
      accounts: {
        default: { accountId: 'default' },
      },
    });
    runtimeOrchestratorMock.applyAccounts.mockResolvedValue(undefined);
    runtimeOrchestratorMock.shutdown.mockResolvedValue(undefined);
    runtimeOrchestratorMock.getStatusSnapshot.mockResolvedValue({
      accounts: {},
      updatedAt: new Date().toISOString(),
    });
    runtimeOrchestratorMock.subscribeStatus.mockReturnValue(() => undefined);
    runtimeOrchestratorMock.sendEnvelope.mockResolvedValue(undefined);
    runtimeOrchestratorMock.ensureReplyConversation.mockResolvedValue({
      peerKey: 'telegram:default:peer:chat-1',
      threadKey: 'telegram:default:peer:chat-1:thread:root',
      conversationId: 'conversation-1',
    });

    settingsApplicationServiceMock.createTelegramSettingsApplicationService.mockReturnValue({
      isSecretStorageAvailable: vi.fn(async () => true),
      getSettings: vi.fn(async () => ({ defaultAccountId: 'default', accounts: {} })),
      updateSettings: vi.fn(async () => ({ defaultAccountId: 'default', accounts: {} })),
      testProxyConnection: vi.fn(async () => ({ ok: true, message: 'ok' })),
      detectProxySuggestion: vi.fn(async () => ({
        proxyEnabled: false,
        reason: 'direct_reachable',
        message: 'ok',
        candidates: [],
      })),
    });

    pairingAdminServiceMock.createTelegramPairingAdminService.mockReturnValue({
      listPairingRequests: vi.fn(async () => []),
      approvePairingRequest: vi.fn(async () => undefined),
      denyPairingRequest: vi.fn(async () => undefined),
    });
  });

  it('init 启动失败后应回滚初始化状态并允许重试', async () => {
    runtimeOrchestratorMock.applyAccounts
      .mockRejectedValueOnce(new Error('startup failed'))
      .mockResolvedValueOnce(undefined);

    const service = await loadService();

    await expect(service.init()).rejects.toThrow('startup failed');
    await expect(service.init()).resolves.toBeUndefined();
    expect(runtimeOrchestratorMock.applyAccounts).toHaveBeenCalledTimes(2);
  });

  it('init 成功后重复调用应保持幂等', async () => {
    const service = await loadService();

    await service.init();
    await service.init();
    expect(runtimeOrchestratorMock.applyAccounts).toHaveBeenCalledTimes(1);
  });

  it('testProxyConnection 应透传到 settings application service', async () => {
    const service = await loadService();
    const payload = {
      accountId: 'default',
      proxyEnabled: true,
      proxyUrl: 'http://127.0.0.1:6152',
    };

    const result = await (service as any).testProxyConnection(payload);
    expect(result).toEqual({ ok: true, message: 'ok' });
    const appService =
      settingsApplicationServiceMock.createTelegramSettingsApplicationService.mock.results[0]
        ?.value;
    expect(appService.testProxyConnection).toHaveBeenCalledWith(payload);
  });

  it('detectProxySuggestion 应透传到 settings application service', async () => {
    const service = await loadService();
    const payload = {
      accountId: 'default',
    };

    const result = await (service as any).detectProxySuggestion(payload);
    expect(result).toMatchObject({
      proxyEnabled: false,
      reason: 'direct_reachable',
    });
    const appService =
      settingsApplicationServiceMock.createTelegramSettingsApplicationService.mock.results[0]
        ?.value;
    expect(appService.detectProxySuggestion).toHaveBeenCalledWith(payload);
  });

  it('sendEnvelope 与 ensureReplyConversation 应透传到 runtime orchestrator', async () => {
    const service = await loadService();
    const envelope = {
      channel: 'telegram',
      accountId: 'default',
      target: { chatId: 'chat-1' },
      message: { text: 'hello' },
    } as const;

    await service.sendEnvelope(envelope);
    const result = await service.ensureReplyConversation({
      accountId: 'default',
      chatId: 'chat-1',
    });

    expect(runtimeOrchestratorMock.sendEnvelope).toHaveBeenCalledWith(envelope);
    expect(runtimeOrchestratorMock.ensureReplyConversation).toHaveBeenCalledWith({
      accountId: 'default',
      chatId: 'chat-1',
    });
    expect(result.conversationId).toBe('conversation-1');
  });

  it('listKnownChats extracts raw chatId and threadId from composite keys', async () => {
    persistenceStoreMock.getTelegramPersistenceStore.mockReturnValue({
      conversationBindings: {
        listAll: vi.fn(async () => [
          {
            channel: 'telegram',
            accountId: 'default',
            peerKey: 'telegram:default:peer:12345',
            threadKey: 'telegram:default:peer:12345:thread:root',
            conversationId: 'conv-1',
            updatedAt: '2026-03-14T10:00:00.000Z',
            peerTitle: 'Team Chat',
          },
          {
            channel: 'telegram',
            accountId: 'default',
            peerKey: 'telegram:default:peer:67890',
            threadKey: 'telegram:default:peer:67890:thread:42',
            conversationId: 'conv-2',
            updatedAt: '2026-03-14T11:00:00.000Z',
            peerUsername: 'alice',
          },
        ]),
      },
    });

    const service = await loadService();
    const chats = await service.listKnownChats();

    expect(chats).toEqual([
      {
        accountId: 'default',
        chatId: '12345',
        threadId: undefined,
        conversationId: 'conv-1',
        lastActiveAt: '2026-03-14T10:00:00.000Z',
        title: 'Team Chat',
        username: undefined,
      },
      {
        accountId: 'default',
        chatId: '67890',
        threadId: '42',
        conversationId: 'conv-2',
        lastActiveAt: '2026-03-14T11:00:00.000Z',
        title: undefined,
        username: 'alice',
      },
    ]);
  });
});

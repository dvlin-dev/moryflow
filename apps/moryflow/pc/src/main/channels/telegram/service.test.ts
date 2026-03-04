/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeOrchestratorMock = vi.hoisted(() => ({
  applyAccounts: vi.fn(),
  shutdown: vi.fn(),
  getStatusSnapshot: vi.fn(),
  subscribeStatus: vi.fn(),
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

    settingsApplicationServiceMock.createTelegramSettingsApplicationService.mockReturnValue({
      isSecretStorageAvailable: vi.fn(async () => true),
      getSettings: vi.fn(async () => ({ defaultAccountId: 'default', accounts: {} })),
      updateSettings: vi.fn(async () => ({ defaultAccountId: 'default', accounts: {} })),
      testProxyConnection: vi.fn(async () => ({ ok: true, message: 'ok' })),
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
});

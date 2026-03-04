import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DesktopApi,
  TelegramAccountSnapshot,
  TelegramRuntimeStatusSnapshot,
  TelegramSettingsSnapshot,
} from '@shared/ipc';
import { TelegramSection } from './telegram-section';

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

const createAccountSnapshot = (
  overrides: Partial<TelegramAccountSnapshot> = {}
): TelegramAccountSnapshot => ({
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
  hasBotToken: false,
  hasWebhookSecret: false,
  hasProxyUrl: false,
  ...overrides,
});

const createSettingsSnapshot = (
  overrides: Partial<TelegramAccountSnapshot> = {}
): TelegramSettingsSnapshot => ({
  defaultAccountId: 'default',
  accounts: {
    default: createAccountSnapshot(overrides),
  },
});

const createStatusSnapshot = (
  overrides: Partial<TelegramRuntimeStatusSnapshot['accounts']['default']> = {}
): TelegramRuntimeStatusSnapshot => ({
  accounts: {
    default: {
      accountId: 'default',
      mode: 'polling',
      enabled: true,
      hasBotToken: false,
      running: false,
      ...overrides,
    },
  },
});

type DesktopApiMocks = {
  getSettings: ReturnType<typeof vi.fn>;
  getStatus: ReturnType<typeof vi.fn>;
  updateSettings: ReturnType<typeof vi.fn>;
  listPairingRequests: ReturnType<typeof vi.fn>;
};

const setupDesktopApi = (overrides: Partial<DesktopApiMocks> = {}): DesktopApiMocks => {
  const apiMocks: DesktopApiMocks = {
    getSettings: vi.fn().mockResolvedValue(createSettingsSnapshot()),
    getStatus: vi.fn().mockResolvedValue(createStatusSnapshot()),
    updateSettings: vi.fn().mockResolvedValue(createSettingsSnapshot({ hasBotToken: true })),
    listPairingRequests: vi.fn().mockResolvedValue([]),
    ...overrides,
  };

  window.desktopAPI = {
    telegram: {
      isSecureStorageAvailable: vi.fn().mockResolvedValue(true),
      getSettings: apiMocks.getSettings,
      updateSettings: apiMocks.updateSettings,
      getStatus: apiMocks.getStatus,
      listPairingRequests: apiMocks.listPairingRequests,
      testProxyConnection: vi.fn().mockResolvedValue({ ok: true, message: 'ok', elapsedMs: 1 }),
      approvePairingRequest: vi.fn().mockResolvedValue({ ok: true }),
      denyPairingRequest: vi.fn().mockResolvedValue({ ok: true }),
      onStatusChange: vi.fn(() => () => undefined),
    },
  } as unknown as DesktopApi;

  return apiMocks;
};

describe('TelegramSection behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('默认展示 Proxy 配置入口，不依赖展开 Advanced', async () => {
    setupDesktopApi();
    render(<TelegramSection />);

    await screen.findByRole('button', { name: 'Save Telegram' });
    expect(screen.getByText('Enable Proxy')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Test Proxy' })).toBeTruthy();
    const proxyInput = screen.getByPlaceholderText('http://127.0.0.1:6152') as HTMLInputElement;
    expect(proxyInput.value).toBe('http://127.0.0.1:6152');
    expect(proxyInput.type).toBe('text');
  });

  it('重启后应回显 bot token(密文输入) 与 proxy URL(明文输入)', async () => {
    setupDesktopApi({
      getSettings: vi.fn().mockResolvedValue(
        createSettingsSnapshot({
          hasBotToken: true,
          hasProxyUrl: true,
          botToken: '123456:AA_test_token',
          proxyUrl: 'http://127.0.0.1:6152',
        })
      ),
    });

    render(<TelegramSection />);
    await screen.findByRole('button', { name: 'Save Telegram' });

    const tokenInput = screen.getByPlaceholderText('123456:AA...') as HTMLInputElement;
    const proxyInput = screen.getByPlaceholderText('http://127.0.0.1:6152') as HTMLInputElement;
    expect(tokenInput.type).toBe('password');
    expect(tokenInput.value).toBe('123456:AA_test_token');
    expect(proxyInput.type).toBe('text');
    expect(proxyInput.value).toBe('http://127.0.0.1:6152');
  });

  it('runtime 启动失败时保留 bot token 输入值，避免被清空', async () => {
    const runtimeError = 'Network request for getMe failed!';
    const getStatus = vi
      .fn()
      .mockResolvedValueOnce(createStatusSnapshot())
      .mockResolvedValueOnce(
        createStatusSnapshot({
          enabled: true,
          hasBotToken: true,
          running: false,
          lastError: runtimeError,
        })
      );
    const updateSettings = vi
      .fn()
      .mockResolvedValue(createSettingsSnapshot({ enabled: true, hasBotToken: true }));

    setupDesktopApi({
      getStatus,
      updateSettings,
    });

    render(<TelegramSection />);
    await screen.findByRole('button', { name: 'Save Telegram' });

    const tokenInput = screen.getByPlaceholderText('123456:AA...') as HTMLInputElement;
    fireEvent.change(tokenInput, { target: { value: 'bot_token_should_stay' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Telegram' }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(runtimeError);
    });

    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(tokenInput.value).toBe('bot_token_should_stay');
  });

  it('手动清空 bot token 与 proxy URL 后保存，应写入 null 触发删除', async () => {
    const getSettings = vi.fn().mockResolvedValue(
      createSettingsSnapshot({
        hasBotToken: true,
        hasProxyUrl: true,
        botToken: '123456:AA_test_token',
        proxyUrl: 'http://127.0.0.1:6152',
      })
    );
    const updateSettings = vi
      .fn()
      .mockResolvedValue(createSettingsSnapshot({ hasBotToken: false }));
    setupDesktopApi({ getSettings, updateSettings });

    render(<TelegramSection />);
    await screen.findByRole('button', { name: 'Save Telegram' });

    const tokenInput = screen.getByPlaceholderText('123456:AA...') as HTMLInputElement;
    const proxyInput = screen.getByPlaceholderText('http://127.0.0.1:6152') as HTMLInputElement;
    fireEvent.change(tokenInput, { target: { value: '' } });
    fireEvent.change(proxyInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Telegram' }));

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledTimes(1);
    });

    const payload = updateSettings.mock.calls[0]?.[0];
    expect(payload?.account?.botToken).toBeNull();
    expect(payload?.account?.proxyUrl).toBeNull();
  });
});

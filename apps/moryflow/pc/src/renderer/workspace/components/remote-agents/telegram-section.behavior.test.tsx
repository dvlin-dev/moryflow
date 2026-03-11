import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DesktopApi,
  TelegramAccountSnapshot,
  TelegramRuntimeStatusSnapshot,
  TelegramSettingsSnapshot,
} from '@shared/ipc';

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
  detectProxySuggestion: ReturnType<typeof vi.fn>;
};

const setupDesktopApi = (overrides: Partial<DesktopApiMocks> = {}): DesktopApiMocks => {
  const apiMocks: DesktopApiMocks = {
    getSettings: vi.fn().mockResolvedValue(createSettingsSnapshot()),
    getStatus: vi.fn().mockResolvedValue(createStatusSnapshot()),
    updateSettings: vi.fn().mockResolvedValue(createSettingsSnapshot({ hasBotToken: true })),
    listPairingRequests: vi.fn().mockResolvedValue([]),
    detectProxySuggestion: vi.fn().mockResolvedValue({
      proxyEnabled: false,
      reason: 'direct_reachable',
      message: 'Telegram API is reachable without proxy.',
      candidates: [],
    }),
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
      detectProxySuggestion: apiMocks.detectProxySuggestion,
      approvePairingRequest: vi.fn().mockResolvedValue({ ok: true }),
      denyPairingRequest: vi.fn().mockResolvedValue({ ok: true }),
      onStatusChange: vi.fn(() => () => undefined),
    },
  } as unknown as DesktopApi;

  return apiMocks;
};

const renderTelegramSection = async () => {
  const { TelegramSection } = await import('./telegram-section');
  render(<TelegramSection />);
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

  it('新账号默认关闭 proxy，开启后预填 surge URL', async () => {
    setupDesktopApi();
    await renderTelegramSection();

    await screen.findByRole('button', { name: 'Save' });
    expect(screen.getByText('Proxy')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Test Proxy' })).toBeNull();
    expect(screen.queryByPlaceholderText('http://127.0.0.1:6152')).toBeNull();
    fireEvent.click(screen.getAllByRole('switch')[0]);
    expect(screen.getByRole('button', { name: 'Test Proxy' })).toBeTruthy();
    const proxyInput = screen.getByPlaceholderText('http://127.0.0.1:6152') as HTMLInputElement;
    expect(proxyInput.value).toBe('http://127.0.0.1:6152');
    expect(proxyInput.type).toBe('text');
  });

  it('默认隐藏开发者参数与 Group 配置，展开 Developer Settings 后可见', async () => {
    setupDesktopApi();
    await renderTelegramSection();

    await screen.findByRole('button', { name: 'Save' });
    expect(screen.queryByText('Runtime Mode')).toBeNull();
    expect(screen.queryByText('Webhook URL')).toBeNull();
    expect(screen.queryByText('Group Policy')).toBeNull();
    expect(screen.queryByText('Enable Telegram Bot')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Developer Settings' }));
    expect(await screen.findByText('Runtime Mode')).toBeTruthy();
    expect(await screen.findByText('Webhook URL')).toBeTruthy();
    expect(await screen.findByText('Group Policy')).toBeTruthy();
    expect(await screen.findByText('Enable Telegram Bot')).toBeTruthy();
  });

  it('默认展示 DM Access 配置入口', async () => {
    setupDesktopApi();
    await renderTelegramSection();

    await screen.findByRole('button', { name: 'Save' });
    expect(screen.getByText('DM Access')).toBeTruthy();
  });

  it('进入页面应自动探测代理并在需要时自动开启 + 预填 URL', async () => {
    const detectProxySuggestion = vi.fn().mockResolvedValue({
      proxyEnabled: true,
      proxyUrl: 'socks5://127.0.0.1:7890',
      reason: 'proxy_candidate_reachable',
      message: 'Detected a working proxy for Telegram API.',
      candidates: ['socks5://127.0.0.1:7890'],
    });
    setupDesktopApi({
      detectProxySuggestion,
      getSettings: vi
        .fn()
        .mockResolvedValue(
          createSettingsSnapshot({ enabled: false, proxyEnabled: false, hasProxyUrl: false })
        ),
    });
    await renderTelegramSection();

    await screen.findByRole('button', { name: 'Save' });
    await waitFor(() => {
      expect(detectProxySuggestion).toHaveBeenCalledWith({ accountId: 'default' });
    });

    await waitFor(() => {
      const proxySwitch = screen.getAllByRole('switch')[0];
      expect(proxySwitch.getAttribute('aria-checked')).toBe('true');
    });
    const proxyInput = await screen.findByPlaceholderText('http://127.0.0.1:6152');
    expect((proxyInput as HTMLInputElement).value).toBe('socks5://127.0.0.1:7890');
  });

  it('DM = Approval required 时显示 Pending Approvals，其他策略不显示', async () => {
    setupDesktopApi({
      getSettings: vi.fn().mockResolvedValue(createSettingsSnapshot({ dmPolicy: 'pairing' })),
    });
    await renderTelegramSection();

    await screen.findByRole('button', { name: 'Save' });
    expect(screen.getByText('Pending Approvals')).toBeTruthy();
    expect(screen.getByText(/pairing code/i)).toBeTruthy();
  });

  it('Developer Settings 应位于 Pending Approvals / Save 之后', async () => {
    setupDesktopApi();
    await renderTelegramSection();

    await screen.findByRole('button', { name: 'Save' });
    const saveButton = screen.getByRole('button', { name: 'Save' });
    const devButton = screen.getByRole('button', { name: 'Developer Settings' });
    const relation = saveButton.compareDocumentPosition(devButton);
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('重启后应回显 bot token(密文输入) 与 proxy URL(明文输入)', async () => {
    setupDesktopApi({
      getSettings: vi.fn().mockResolvedValue(
        createSettingsSnapshot({
          hasBotToken: true,
          hasProxyUrl: true,
          proxyEnabled: true,
          botTokenEcho: 'mftg:v1:test-echo-token',
          proxyUrl: 'http://127.0.0.1:6152',
        })
      ),
    });

    await renderTelegramSection();
    await screen.findByRole('button', { name: 'Save' });

    const tokenInput = screen.getByPlaceholderText(
      'Paste token from @BotFather'
    ) as HTMLInputElement;
    const proxyInput = screen.getByPlaceholderText('http://127.0.0.1:6152') as HTMLInputElement;
    expect(tokenInput.type).toBe('password');
    expect(tokenInput.value).toBe('mftg:v1:test-echo-token');
    expect(proxyInput.type).toBe('text');
    expect(proxyInput.value).toBe('http://127.0.0.1:6152');
  });

  it('未编辑 bot token/proxy URL 时保存不应提交 null 删除', async () => {
    const updateSettings = vi.fn().mockResolvedValue(
      createSettingsSnapshot({
        hasBotToken: true,
        hasProxyUrl: true,
        proxyEnabled: true,
        botTokenEcho: 'mftg:v1:test-echo-token',
        proxyUrl: 'http://127.0.0.1:6152',
      })
    );
    setupDesktopApi({
      getSettings: vi.fn().mockResolvedValue(
        createSettingsSnapshot({
          hasBotToken: true,
          hasProxyUrl: true,
          proxyEnabled: true,
          botTokenEcho: 'mftg:v1:test-echo-token',
          proxyUrl: 'http://127.0.0.1:6152',
        })
      ),
      updateSettings,
    });

    await renderTelegramSection();
    await screen.findByRole('button', { name: 'Save' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledTimes(1);
    });

    const payload = updateSettings.mock.calls[0]?.[0];
    expect(payload?.account?.botToken).toBeUndefined();
    expect(payload?.account?.proxyUrl).toBeUndefined();
  });

  it('默认预填 proxy URL 且 proxy 未启用时，保存不应提交 proxyUrl', async () => {
    const updateSettings = vi
      .fn()
      .mockResolvedValue(
        createSettingsSnapshot({ enabled: false, proxyEnabled: false, hasProxyUrl: false })
      );
    setupDesktopApi({
      getSettings: vi
        .fn()
        .mockResolvedValue(
          createSettingsSnapshot({ enabled: false, proxyEnabled: false, hasProxyUrl: false })
        ),
      updateSettings,
    });

    await renderTelegramSection();
    await screen.findByRole('button', { name: 'Save' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledTimes(1);
    });

    const payload = updateSettings.mock.calls[0]?.[0];
    expect(payload?.account?.proxyEnabled).toBe(false);
    expect(payload?.account?.proxyUrl).toBeUndefined();
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

    await renderTelegramSection();
    await screen.findByRole('button', { name: 'Save' });

    const tokenInput = screen.getByPlaceholderText(
      'Paste token from @BotFather'
    ) as HTMLInputElement;
    fireEvent.change(tokenInput, { target: { value: 'bot_token_should_stay' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(runtimeError);
    });

    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(tokenInput.value).toBe('bot_token_should_stay');
    expect(
      screen.getByText(
        'Network issue detected while contacting Telegram API. If Telegram is blocked in your environment, enable Proxy and click Test Proxy.'
      )
    ).toBeTruthy();
  });

  it('手动清空 bot token 与 proxy URL 后保存，应写入 null 触发删除', async () => {
    const getSettings = vi.fn().mockResolvedValue(
      createSettingsSnapshot({
        hasBotToken: true,
        hasProxyUrl: true,
        proxyEnabled: true,
        botTokenEcho: 'mftg:v1:test-echo-token',
        proxyUrl: 'http://127.0.0.1:6152',
      })
    );
    const updateSettings = vi
      .fn()
      .mockResolvedValue(createSettingsSnapshot({ hasBotToken: false }));
    setupDesktopApi({ getSettings, updateSettings });

    await renderTelegramSection();
    await screen.findByRole('button', { name: 'Save' });

    const tokenInput = screen.getByPlaceholderText(
      'Paste token from @BotFather'
    ) as HTMLInputElement;
    const proxyInput = screen.getByPlaceholderText('http://127.0.0.1:6152') as HTMLInputElement;
    fireEvent.change(tokenInput, { target: { value: '' } });
    fireEvent.change(proxyInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledTimes(1);
    });

    const payload = updateSettings.mock.calls[0]?.[0];
    expect(payload?.account?.botToken).toBeNull();
    expect(payload?.account?.proxyUrl).toBeNull();
  });
});

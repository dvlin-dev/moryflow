import { afterEach, describe, expect, it, vi } from 'vitest';

describe('telegram secret store', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('keytar');
  });

  it('keytar 不可用时写入应显式失败', async () => {
    vi.doMock('keytar', () => {
      throw new Error('module not found');
    });

    const mod = await import('./secret-store.js');

    await expect(mod.setTelegramBotToken('default', 'token')).rejects.toThrow(
      'Secure credential storage is unavailable.'
    );
  });

  it('keytar 写入错误时应向上抛出', async () => {
    const setPassword = vi.fn(async () => {
      throw new Error('write denied');
    });

    vi.doMock('keytar', () => ({
      default: {
        getPassword: vi.fn(async () => null),
        setPassword,
        deletePassword: vi.fn(async () => true),
      },
    }));

    const mod = await import('./secret-store.js');

    await expect(mod.setTelegramWebhookSecret('default', 'sec')).rejects.toThrow(
      'Secure credential storage failed: write denied'
    );
    expect(setPassword).toHaveBeenCalledTimes(1);
  });

  it('应支持 proxy URL 的写入/读取/清理', async () => {
    const getPassword = vi.fn(async () => 'http://127.0.0.1:6152');
    const setPassword = vi.fn(async () => undefined);
    const deletePassword = vi.fn(async () => true);

    vi.doMock('keytar', () => ({
      default: {
        getPassword,
        setPassword,
        deletePassword,
      },
    }));

    const mod = await import('./secret-store.js');

    await expect(
      (mod as any).setTelegramProxyUrl('default', 'http://127.0.0.1:6152')
    ).resolves.toBe(undefined);
    await expect((mod as any).getTelegramProxyUrl('default')).resolves.toBe(
      'http://127.0.0.1:6152'
    );
    await expect((mod as any).clearTelegramProxyUrl('default')).resolves.toBe(undefined);

    expect(setPassword).toHaveBeenCalledTimes(1);
    expect(getPassword).toHaveBeenCalledTimes(1);
    expect(deletePassword).toHaveBeenCalledTimes(1);
  });
});

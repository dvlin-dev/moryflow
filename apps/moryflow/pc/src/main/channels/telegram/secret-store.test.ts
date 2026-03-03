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
});

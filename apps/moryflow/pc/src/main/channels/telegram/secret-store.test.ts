import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('telegram secret store', () => {
  let userDataDir: string;

  beforeEach(async () => {
    userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'moryflow-telegram-secret-store-'));
    process.env['MORYFLOW_E2E_USER_DATA'] = userDataDir;
  });

  afterEach(async () => {
    vi.resetModules();
    delete process.env['MORYFLOW_E2E_USER_DATA'];
    await fs.rm(userDataDir, { recursive: true, force: true });
  });

  it('应支持 bot token 本地写入与读取', async () => {
    const mod = await import('./secret-store.js');

    await expect(mod.setTelegramBotToken('default', 'token')).resolves.toBeUndefined();
    await expect(mod.getTelegramBotToken('default')).resolves.toBe('token');
  });

  it('重载模块后仍应从本地持久化中读回 bot token', async () => {
    const firstLoad = await import('./secret-store.js');
    await expect(firstLoad.setTelegramBotToken('default', 'token')).resolves.toBeUndefined();

    vi.resetModules();

    const secondLoad = await import('./secret-store.js');
    await expect(secondLoad.getTelegramBotToken('default')).resolves.toBe('token');
  });

  it('应支持 webhook secret 本地写入与清理', async () => {
    const mod = await import('./secret-store.js');

    await expect(mod.setTelegramWebhookSecret('default', 'sec')).resolves.toBeUndefined();
    await expect(mod.getTelegramWebhookSecret('default')).resolves.toBe('sec');
    await expect(mod.clearTelegramWebhookSecret('default')).resolves.toBeUndefined();
    await expect(mod.getTelegramWebhookSecret('default')).resolves.toBeNull();
  });

  it('应支持 proxy URL 的本地写入/读取/清理', async () => {
    const mod = await import('./secret-store.js');

    await expect(
      (mod as any).setTelegramProxyUrl('default', 'http://127.0.0.1:6152')
    ).resolves.toBe(undefined);
    await expect((mod as any).getTelegramProxyUrl('default')).resolves.toBe(
      'http://127.0.0.1:6152'
    );
    await expect((mod as any).clearTelegramProxyUrl('default')).resolves.toBe(undefined);
    await expect((mod as any).getTelegramProxyUrl('default')).resolves.toBeNull();
  });
});

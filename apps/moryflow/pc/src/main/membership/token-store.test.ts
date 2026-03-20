import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('membership token store', () => {
  let userDataDir: string;

  beforeEach(async () => {
    userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'moryflow-membership-token-store-'));
    process.env['MORYFLOW_E2E_USER_DATA'] = userDataDir;
  });

  afterEach(async () => {
    vi.resetModules();
    delete process.env['MORYFLOW_E2E_USER_DATA'];
    await fs.rm(userDataDir, { recursive: true, force: true });
  });

  it('应支持 access/refresh token 本地持久化', async () => {
    const mod = await import('./token-store.js');

    await expect(mod.setRefreshToken('refresh-token')).resolves.toBeUndefined();
    await expect(mod.setAccessToken('access-token')).resolves.toBeUndefined();
    await expect(mod.setAccessTokenExpiresAt('2026-03-11T00:00:00.000Z')).resolves.toBeUndefined();

    await expect(mod.getRefreshToken()).resolves.toBe('refresh-token');
    await expect(mod.getAccessToken()).resolves.toBe('access-token');
    await expect(mod.getAccessTokenExpiresAt()).resolves.toBe('2026-03-11T00:00:00.000Z');
  });

  it('重载模块后仍应从本地持久化中读回 membership token', async () => {
    const firstLoad = await import('./token-store.js');

    await firstLoad.setRefreshToken('refresh-token');
    await firstLoad.setAccessToken('access-token');
    await firstLoad.setAccessTokenExpiresAt('2026-03-11T00:00:00.000Z');

    vi.resetModules();

    const secondLoad = await import('./token-store.js');
    await expect(secondLoad.getRefreshToken()).resolves.toBe('refresh-token');
    await expect(secondLoad.getAccessToken()).resolves.toBe('access-token');
    await expect(secondLoad.getAccessTokenExpiresAt()).resolves.toBe('2026-03-11T00:00:00.000Z');
  });

  it('清理接口应移除本地持久化的 membership token', async () => {
    const mod = await import('./token-store.js');

    await mod.setRefreshToken('refresh-token');
    await mod.setAccessToken('access-token');
    await mod.setAccessTokenExpiresAt('2026-03-11T00:00:00.000Z');

    await mod.clearRefreshToken();
    await mod.clearAccessToken();

    await expect(mod.getRefreshToken()).resolves.toBeNull();
    await expect(mod.getAccessToken()).resolves.toBeNull();
    await expect(mod.getAccessTokenExpiresAt()).resolves.toBeNull();
  });
});

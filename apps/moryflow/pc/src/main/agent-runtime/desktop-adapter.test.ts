import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('createDesktopCapabilities', () => {
  let userDataDir: string;

  beforeEach(async () => {
    userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'moryflow-desktop-capabilities-'));
    process.env['MORYFLOW_E2E_USER_DATA'] = userDataDir;
  });

  afterEach(async () => {
    vi.resetModules();
    delete process.env['MORYFLOW_E2E_USER_DATA'];
    await fs.rm(userDataDir, { recursive: true, force: true });
  });

  it('secureStorage 应支持本地 round-trip', async () => {
    const { createDesktopCapabilities } = await import('./desktop-adapter.js');

    const secureStorage = createDesktopCapabilities().secureStorage;

    await expect(secureStorage.set('token', 'value')).resolves.toBeUndefined();
    await expect(secureStorage.get('token')).resolves.toBe('value');
    await expect(secureStorage.remove('token')).resolves.toBeUndefined();
    await expect(secureStorage.get('token')).resolves.toBeNull();
  });

  it('重载模块后仍应从本地持久化中读回 secureStorage 值', async () => {
    const firstLoad = await import('./desktop-adapter.js');
    const firstStorage = firstLoad.createDesktopCapabilities().secureStorage;

    await expect(firstStorage.set('token', 'value')).resolves.toBeUndefined();

    vi.resetModules();

    const secondLoad = await import('./desktop-adapter.js');
    const secondStorage = secondLoad.createDesktopCapabilities().secureStorage;
    await expect(secondStorage.get('token')).resolves.toBe('value');
  });
});

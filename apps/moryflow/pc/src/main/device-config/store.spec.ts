import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('device-config store', () => {
  let userDataDir: string;

  beforeEach(async () => {
    userDataDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'moryflow-device-config-'),
    );
    process.env['MORYFLOW_E2E_USER_DATA'] = userDataDir;
  });

  afterEach(async () => {
    vi.resetModules();
    delete process.env['MORYFLOW_E2E_USER_DATA'];
    await fs.rm(userDataDir, { recursive: true, force: true });
  });

  it('deviceId/deviceName 独立持久化且重载模块后仍可读回', async () => {
    const firstLoad = await import('./store.js');

    firstLoad.writeDeviceConfig({
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
      deviceName: 'Test Mac',
    });

    vi.resetModules();

    const secondLoad = await import('./store.js');
    expect(secondLoad.readDeviceConfig()).toEqual({
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
      deviceName: 'Test Mac',
    });
  });
});

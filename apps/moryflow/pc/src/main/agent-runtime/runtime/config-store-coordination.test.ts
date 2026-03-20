/* @vitest-environment node */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { parseRuntimeConfig } from '@moryflow/agents-runtime';

describe('config store coordination', () => {
  let tempHome: string;
  let previousHome: string | undefined;

  beforeEach(async () => {
    vi.resetModules();
    tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'pc-config-store-test-'));
    previousHome = process.env.HOME;
    process.env.HOME = tempHome;
  });

  afterEach(async () => {
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
    await fs.rm(tempHome, { recursive: true, force: true });
  });

  it('preserves global mode when permission store persists allow rules', async () => {
    const { createDesktopPermissionRuleStore } = await import('../permission/permission-store.js');
    const { createDesktopRuntimeConfigStore } = await import('./runtime-config.js');

    const permissionStore = createDesktopPermissionRuleStore();
    const runtimeStore = createDesktopRuntimeConfigStore();

    // 预热权限存储缓存，复现历史“缓存内容覆盖 mode 更新”的触发条件。
    await permissionStore.getToolPolicy();

    const modeResult = await runtimeStore.setGlobalMode('full_access');
    expect(modeResult.mode).toBe('full_access');

    const toolPolicy = await permissionStore.appendAllowRule({ tool: 'Read' });
    expect(toolPolicy.allow).toContainEqual({ tool: 'Read' });

    const configPath = path.join(tempHome, '.moryflow', 'config.jsonc');
    const content = await fs.readFile(configPath, 'utf-8');
    const parsed = parseRuntimeConfig(content);
    expect(parsed.errors).toEqual([]);
    expect(parsed.config.mode?.global).toBe('full_access');
    expect(parsed.config.permission?.toolPolicy?.allow).toContainEqual({ tool: 'Read' });
  });
});

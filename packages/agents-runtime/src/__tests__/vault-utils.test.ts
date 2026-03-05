import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RunContext } from '@openai/agents-core';
import { createVaultUtils } from '../vault-utils';
import type { PlatformCapabilities } from '@moryflow/agents-adapter';

const createCapabilities = (): PlatformCapabilities => {
  const files = new Map<string, string>([
    ['/vault/a.md', '# in vault'],
    ['/external/b.md', '# external'],
  ]);
  return {
    fs: {
      readFile: async (filePath: string) => files.get(filePath) ?? '',
      writeFile: async (_filePath: string, _content: string) => undefined,
      delete: async (_filePath: string) => undefined,
      move: async (_from: string, _to: string) => undefined,
      mkdir: async (_dir: string) => undefined,
      readdir: async (_dir: string) => [],
      exists: async (filePath: string) => files.has(filePath),
      stat: async (filePath: string) => ({
        isDirectory: false,
        isFile: true,
        size: (files.get(filePath) ?? '').length,
        mtime: 1,
      }),
      access: async (filePath: string) => files.has(filePath),
    },
    path: {
      join: path.join,
      resolve: path.resolve,
      dirname: path.dirname,
      basename: path.basename,
      extname: path.extname,
      isAbsolute: path.isAbsolute,
      normalize: path.normalize,
      relative: path.relative,
      sep: path.sep,
    },
    storage: {
      get: async () => null,
      set: async () => undefined,
      remove: async () => undefined,
    },
    secureStorage: {
      get: async () => null,
      set: async () => undefined,
      remove: async () => undefined,
    },
    fetch: globalThis.fetch,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    platform: 'desktop',
    auth: {
      getToken: async () => null,
      getApiUrl: () => 'https://server.anyhunt.app',
    },
  };
};

const createRunContext = (mode: 'ask' | 'full_access') =>
  new RunContext({
    mode,
    vaultRoot: '/vault',
    chatId: 'chat-1',
  });

describe('vault-utils path strategy', () => {
  it('ask 模式拒绝 Vault 外绝对路径', async () => {
    const vaultUtils = createVaultUtils(
      createCapabilities(),
      {
        sha256: async () => 'sha',
        randomUUID: () => 'uuid',
      },
      async () => '/vault'
    );

    await expect(vaultUtils.resolvePath('/external/b.md', createRunContext('ask'))).rejects.toThrow(
      '目标路径不在当前 Vault 中'
    );
  });

  it('full_access 模式允许 Vault 外绝对路径', async () => {
    const vaultUtils = createVaultUtils(
      createCapabilities(),
      {
        sha256: async () => 'sha',
        randomUUID: () => 'uuid',
      },
      async () => '/vault'
    );

    const resolved = await vaultUtils.resolvePath(
      '/external/b.md',
      createRunContext('full_access')
    );
    expect(resolved.absolute).toBe('/external/b.md');
    expect(resolved.relative).toBe('/external/b.md');
  });
});

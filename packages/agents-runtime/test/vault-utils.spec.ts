import { describe, it, expect } from 'vitest';
import path from 'path';
import { createVaultUtils } from '../src/vault-utils';
import type { PlatformCapabilities, CryptoUtils } from '@anyhunt/agents-adapter';

describe('createVaultUtils', () => {
  const vaultRoot = '/Users/test/vault';

  const capabilities = {
    fs: {
      readFile: async () => '',
      writeFile: async () => undefined,
      delete: async () => undefined,
      move: async () => undefined,
      mkdir: async () => undefined,
      readdir: async () => [],
      exists: async () => false,
      stat: async () => ({
        isDirectory: false,
        isFile: true,
        size: 0,
        mtime: Date.now(),
      }),
      access: async () => true,
    },
    path,
  } as PlatformCapabilities;

  const crypto: CryptoUtils = {
    sha256: async () => '0'.repeat(64),
    randomUUID: () => '00000000-0000-0000-0000-000000000000',
  };

  const vaultUtils = createVaultUtils(capabilities, crypto, async () => vaultRoot);

  it('允许解析 Vault 内路径', async () => {
    const resolved = await vaultUtils.resolvePath('notes/test.md');
    expect(resolved.absolute).toBe(path.resolve(vaultRoot, 'notes/test.md'));
    expect(resolved.relative).toBe('notes/test.md');
  });

  it('拒绝 Vault 前缀但不在 Vault 内的路径', async () => {
    await expect(vaultUtils.resolvePath(`${vaultRoot}2/test.md`)).rejects.toThrow(
      '目标路径不在当前 Vault 中'
    );
  });

  it('Vault 根目录解析为 .', async () => {
    const resolved = await vaultUtils.resolvePath('.');
    expect(resolved.relative).toBe('.');
  });
});

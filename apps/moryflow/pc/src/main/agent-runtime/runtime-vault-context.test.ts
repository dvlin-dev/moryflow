/* @vitest-environment node */

import { describe, expect, it } from 'vitest';
import { getRuntimeVaultRoot, runWithRuntimeVaultRoot } from './runtime-vault-context.js';

describe('runtime-vault-context', () => {
  it('未注入上下文时返回 null', () => {
    expect(getRuntimeVaultRoot()).toBeNull();
  });

  it('在闭包内返回当前会话 vaultRoot，退出后恢复为空', async () => {
    const valueInside = await runWithRuntimeVaultRoot('/vault-a', async () => {
      return getRuntimeVaultRoot();
    });

    expect(valueInside).toBe('/vault-a');
    expect(getRuntimeVaultRoot()).toBeNull();
  });

  it('并发请求上下文互不污染', async () => {
    const [a, b] = await Promise.all([
      runWithRuntimeVaultRoot('/vault-a', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return getRuntimeVaultRoot();
      }),
      runWithRuntimeVaultRoot('/vault-b', async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return getRuntimeVaultRoot();
      }),
    ]);

    expect(a).toBe('/vault-a');
    expect(b).toBe('/vault-b');
  });

  it('相对路径 vaultRoot 会直接拒绝', async () => {
    await expect(
      runWithRuntimeVaultRoot('relative/path', async () => {
        return getRuntimeVaultRoot();
      })
    ).rejects.toThrow('当前会话未绑定 workspace，无法启动对话');
  });
});

/**
 * [INPUT]: 会话级 vaultRoot + 运行任务闭包
 * [OUTPUT]: 当前异步调用链可读取的运行时 vaultRoot
 * [POS]: Agent Runtime 会话级 Vault 上下文（隔离并发请求）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import path from 'node:path';

const runtimeVaultRootStorage = new AsyncLocalStorage<string>();

const normalizeVaultRoot = (value: string): string => value.trim();
const isScopedVaultPath = (value: string): boolean => value.length > 0 && path.isAbsolute(value);

export const getRuntimeVaultRoot = (): string | null => {
  const scoped = runtimeVaultRootStorage.getStore();
  if (!scoped) {
    return null;
  }
  const normalized = normalizeVaultRoot(scoped);
  return isScopedVaultPath(normalized) ? normalized : null;
};

export const runWithRuntimeVaultRoot = async <T>(
  vaultRoot: string,
  task: () => Promise<T>
): Promise<T> => {
  const normalized = normalizeVaultRoot(vaultRoot);
  if (!isScopedVaultPath(normalized)) {
    throw new Error('当前会话未绑定 workspace，无法启动对话');
  }
  return runtimeVaultRootStorage.run(normalized, task);
};

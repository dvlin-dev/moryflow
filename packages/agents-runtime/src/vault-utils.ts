import type {
  PlatformCapabilities,
  ResolvedVaultPath,
  CryptoUtils,
} from '@moryflow/agents-adapter';
import type { RunContext } from '@openai/agents-core';
import type { AgentContext } from './types';

/**
 * Vault 文件数据
 */
export interface VaultFileData extends ResolvedVaultPath {
  stats: {
    size: number;
    mtime: number;
    isFile: boolean;
    isDirectory: boolean;
  };
  content: string;
  sha256: string;
}

/**
 * Vault 工具集
 */
export interface VaultUtils {
  /** 获取 Vault 根路径 */
  getVaultRoot(): Promise<string>;
  /** 解析路径 */
  resolvePath(
    targetPath: string,
    runContext?: RunContext<AgentContext>
  ): Promise<ResolvedVaultPath>;
  /** 读取文件 */
  readFile(targetPath: string, runContext?: RunContext<AgentContext>): Promise<VaultFileData>;
  /** 计算 SHA256（异步） */
  computeSha256(input: string): Promise<string>;
  /** 确保文件可读 */
  ensureFileReadable(absolutePath: string): Promise<{ size: number; mtime: number }>;
}

/**
 * 创建 Vault 工具集
 */
export const createVaultUtils = (
  capabilities: PlatformCapabilities,
  crypto: CryptoUtils,
  getVaultRootFn: () => Promise<string>
): VaultUtils => {
  const { fs, path } = capabilities;

  const isInsideRoot = (root: string, target: string): boolean => {
    const relative = path.relative(root, target);
    if (relative === '') return true;
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  };

  const getVaultRoot = async (): Promise<string> => {
    const root = await getVaultRootFn();
    return path.resolve(root);
  };

  const resolvePath = async (
    targetPath: string,
    runContext?: RunContext<AgentContext>
  ): Promise<ResolvedVaultPath> => {
    const root = await getVaultRoot();
    const mode = runContext?.context?.mode ?? 'ask';
    const normalized = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(root, targetPath);

    const isInsideVaultRoot = isInsideRoot(root, normalized);
    if (mode !== 'full_access' && !isInsideVaultRoot) {
      throw new Error('目标路径不在当前 Vault 中');
    }

    const relative = isInsideVaultRoot ? path.relative(root, normalized) || '.' : normalized;
    const normalizedRelative = relative.split(path.sep).join('/');

    return { root, absolute: normalized, relative: normalizedRelative };
  };

  const ensureFileReadable = async (absolutePath: string) => {
    const canAccess = await fs.access(absolutePath);
    if (!canAccess) {
      const err = new Error(`无法访问文件: ${absolutePath}`) as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    }

    const stats = await fs.stat(absolutePath);
    if (!stats.isFile) {
      throw new Error('目标路径不是文件');
    }

    return { size: stats.size, mtime: stats.mtime };
  };

  const computeSha256 = async (input: string): Promise<string> => {
    return await crypto.sha256(input);
  };

  const readFile = async (
    targetPath: string,
    runContext?: RunContext<AgentContext>
  ): Promise<VaultFileData> => {
    const resolved = await resolvePath(targetPath, runContext);
    const fileStats = await ensureFileReadable(resolved.absolute);
    const content = await fs.readFile(resolved.absolute, 'utf-8');
    const sha256 = await computeSha256(content);

    return {
      ...resolved,
      stats: {
        size: fileStats.size,
        mtime: fileStats.mtime,
        isFile: true,
        isDirectory: false,
      },
      content,
      sha256,
    };
  };

  return {
    getVaultRoot,
    resolvePath,
    readFile,
    computeSha256,
    ensureFileReadable,
  };
};

/**
 * [PROVIDES]: Desktop Tool 输出存储（Vault/.agent-output + userData 回退）
 * [DEPENDS]: electron, agents-adapter, agents-runtime
 * [POS]: PC Agent Runtime 的 Truncation 落盘与清理实现
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { app } from 'electron';
import type { PlatformCapabilities, CryptoUtils } from '@anyhunt/agents-adapter';
import type { ToolOutputStorage } from '@anyhunt/agents-runtime';

const VAULT_OUTPUT_DIR = '.agent-output';
const FALLBACK_OUTPUT_DIR = 'agent-output';
const DAY_MS = 24 * 60 * 60 * 1000;

const buildFileSlug = (toolName?: string): string => {
  if (!toolName) return 'tool';
  const slug = toolName.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'tool';
};

const isWithinRoot = (
  root: string,
  target: string,
  pathUtils: PlatformCapabilities['path']
): boolean => {
  const relative = pathUtils.relative(root, target);
  if (relative === '') return true;
  return !relative.startsWith('..') && !pathUtils.isAbsolute(relative);
};

const resolveOutputRoots = (
  vaultRoot: string | undefined,
  pathUtils: PlatformCapabilities['path']
): string[] => {
  const roots: string[] = [];
  if (vaultRoot) {
    roots.push(pathUtils.resolve(vaultRoot, VAULT_OUTPUT_DIR));
  }
  roots.push(pathUtils.resolve(app.getPath('userData'), FALLBACK_OUTPUT_DIR));
  return roots;
};

const ensureDirectory = async (
  fs: PlatformCapabilities['fs'],
  dirPath: string
): Promise<boolean> => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    const stat = await fs.stat(dirPath);
    return stat.isDirectory;
  } catch {
    return false;
  }
};

const cleanupExpiredFiles = async (
  fs: PlatformCapabilities['fs'],
  pathUtils: PlatformCapabilities['path'],
  logger: PlatformCapabilities['logger'],
  dirPath: string,
  ttlDays: number
) => {
  try {
    const entries = await fs.readdir(dirPath);
    const cutoff = Date.now() - ttlDays * DAY_MS;
    for (const entry of entries) {
      const fullPath = pathUtils.join(dirPath, entry);
      try {
        const stat = await fs.stat(fullPath);
        if (!stat.isFile) continue;
        if (stat.mtime < cutoff) {
          await fs.delete(fullPath);
        }
      } catch (error) {
        logger.warn('[tool-output] cleanup failed', error);
      }
    }
  } catch {
    // 忽略目录不存在或读取失败
  }
};

export const createDesktopToolOutputStorage = (input: {
  capabilities: PlatformCapabilities;
  crypto: CryptoUtils;
  ttlDays: number;
}): ToolOutputStorage => {
  const { capabilities, crypto, ttlDays } = input;
  const { fs, path: pathUtils, logger } = capabilities;

  let lastOutputDir: string | null = null;

  const resolveWritableDir = async (vaultRoot?: string): Promise<string> => {
    const roots = resolveOutputRoots(vaultRoot, pathUtils);
    for (const root of roots) {
      const ok = await ensureDirectory(fs, root);
      if (ok) {
        return root;
      }
      logger.warn('[tool-output] failed to prepare output dir', root);
    }
    throw new Error('Failed to prepare output directory');
  };

  return {
    async write({ content, toolName, runContext }) {
      const vaultRoot = runContext?.context?.vaultRoot;
      const outputDir = await resolveWritableDir(vaultRoot);
      lastOutputDir = outputDir;

      const fileSlug = buildFileSlug(toolName);
      const fileName = `tool-output-${Date.now()}-${fileSlug}-${crypto.randomUUID()}.txt`;
      const fullPath = pathUtils.join(outputDir, fileName);

      await fs.writeFile(fullPath, content);

      return { fullPath };
    },
    async cleanup() {
      if (!lastOutputDir) return;
      await cleanupExpiredFiles(fs, pathUtils, logger, lastOutputDir, ttlDays);
    },
  };
};

export const isToolOutputPathAllowed = (input: {
  targetPath: string;
  vaultRoot?: string;
  pathUtils: PlatformCapabilities['path'];
}): boolean => {
  const roots = resolveOutputRoots(input.vaultRoot, input.pathUtils);
  const normalized = input.pathUtils.resolve(input.targetPath);
  return roots.some((root) => isWithinRoot(root, normalized, input.pathUtils));
};

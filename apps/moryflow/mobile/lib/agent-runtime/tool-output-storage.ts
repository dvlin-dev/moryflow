/**
 * [PROVIDES]: Mobile Tool 输出存储（Paths.document/agent-output）
 * [DEPENDS]: expo-file-system, agents-adapter, agents-runtime
 * [POS]: Mobile Agent Runtime 的 Truncation 落盘与清理实现
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Directory, File, Paths } from 'expo-file-system';
import type { CryptoUtils } from '@moryflow/agents-adapter';
import type { ToolOutputStorage } from '@moryflow/agents-runtime';

const OUTPUT_DIR = Paths.join(Paths.document.uri, 'agent-output');
const DAY_MS = 24 * 60 * 60 * 1000;

const buildFileSlug = (toolName?: string): string => {
  if (!toolName) return 'tool';
  const slug = toolName.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'tool';
};

const normalizeMtime = (value?: number): number => {
  if (!value) return 0;
  return value < 1e12 ? value * 1000 : value;
};

const ensureOutputDir = (): Directory => {
  const dir = new Directory(OUTPUT_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
};

export const createMobileToolOutputStorage = (input: {
  crypto: CryptoUtils;
  ttlDays: number;
}): ToolOutputStorage => {
  const { crypto, ttlDays } = input;
  let lastDirUri: string | null = null;

  return {
    async write({ content, toolName }) {
      const dir = ensureOutputDir();
      lastDirUri = dir.uri;

      const fileSlug = buildFileSlug(toolName);
      const fileName = `tool-output-${Date.now()}-${fileSlug}-${crypto.randomUUID()}.txt`;
      const fullPath = Paths.join(dir.uri, fileName);

      await new File(fullPath).write(content);

      return { fullPath };
    },
    async cleanup() {
      if (!lastDirUri) return;
      const dir = new Directory(lastDirUri);
      if (!dir.exists) return;

      const entries = dir.list();
      const cutoff = Date.now() - ttlDays * DAY_MS;
      for (const entry of entries) {
        if (!(entry instanceof File)) continue;
        try {
          const info = entry.info();
          const mtime = normalizeMtime(info.modificationTime ?? entry.modificationTime ?? 0);
          if (mtime && mtime < cutoff) {
            entry.delete();
          }
        } catch (error) {
          console.warn('[tool-output] cleanup failed', error);
        }
      }
    },
  };
};

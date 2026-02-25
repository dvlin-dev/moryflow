import { tool, type RunContext } from '@openai/agents-core';
import { z } from 'zod';
import type { PlatformCapabilities } from '@moryflow/agents-adapter';
import type { AgentContext, VaultUtils } from '@moryflow/agents-runtime';
import { toolSummarySchema, normalizeRelativePath } from '../shared';

const lsParams = z.object({
  summary: toolSummarySchema.default('ls'),
  path: z.string().default('.').describe('目录路径，默认为根目录'),
  show_hidden: z.boolean().default(false).describe('是否显示隐藏文件'),
});

/**
 * 创建列出目录内容工具
 */
export const createLsTool = (capabilities: PlatformCapabilities, vaultUtils: VaultUtils) => {
  const { fs, path: pathUtils } = capabilities;

  return tool({
    name: 'ls',
    description: '列出指定目录的内容（仅一层），返回文件/文件夹列表及其大小、修改时间。',
    parameters: lsParams,
    async execute(
      { path: directory, show_hidden: showHidden },
      _runContext?: RunContext<AgentContext>
    ) {
      console.log('[tool] ls', { path: directory, showHidden });

      const resolved = await vaultUtils.resolvePath(directory || '.');
      const root = resolved.root;

      const entries = await fs.readdir(resolved.absolute);
      const results: Array<{
        name: string;
        path: string;
        type: 'file' | 'folder';
        size?: number;
        mtime: number;
      }> = [];

      for (const name of entries) {
        if (!showHidden && name.startsWith('.')) {
          continue;
        }

        const entryPath = pathUtils.join(resolved.absolute, name);
        const relative = normalizeRelativePath(root, entryPath, pathUtils);

        try {
          const entryStats = await fs.stat(entryPath);
          results.push({
            name,
            path: relative,
            type: entryStats.isDirectory ? 'folder' : 'file',
            size: entryStats.isFile ? entryStats.size : undefined,
            mtime: entryStats.mtime,
          });
        } catch {
          // 忽略无法访问的文件
          results.push({
            name,
            path: relative,
            type: 'file',
            mtime: 0,
          });
        }
      }

      return {
        path: resolved.relative || '.',
        entries: results,
        total: results.length,
      };
    },
  });
};

import { tool, type RunContext } from '@openai/agents-core';
import { z } from 'zod';
import type { PlatformCapabilities } from '@moryflow/agents-adapter';
import type { AgentContext, VaultUtils } from '@moryflow/agents-runtime';
import { toolSummarySchema } from '../shared';

const lsParams = z.object({
  summary: toolSummarySchema.default('ls'),
  path: z.string().default('.').describe('Directory path, defaults to root'),
  show_hidden: z.boolean().default(false).describe('Whether to show hidden files'),
});

/**
 * 创建列出目录内容工具
 */
export const createLsTool = (capabilities: PlatformCapabilities, vaultUtils: VaultUtils) => {
  const { fs, path: pathUtils } = capabilities;

  return tool({
    name: 'ls',
    description: `List directory contents (one level). Returns files/folders with size and modification time.`,
    parameters: lsParams,
    async execute(
      { path: directory, show_hidden: showHidden },
      runContext?: RunContext<AgentContext>
    ) {
      console.log('[tool] ls', { path: directory, showHidden });

      const resolved = await vaultUtils.resolvePath(directory || '.', runContext);

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
        const relative = pathUtils
          .join(resolved.relative === '.' ? '' : resolved.relative, name)
          .split(pathUtils.sep)
          .join('/');

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

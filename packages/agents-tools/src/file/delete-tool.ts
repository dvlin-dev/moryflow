import { tool, type RunContext } from '@openai/agents-core';
import { z } from 'zod';
import type { PlatformCapabilities } from '@anyhunt/agents-adapter';
import type { AgentContext, VaultUtils } from '@anyhunt/agents-runtime';
import { toolSummarySchema } from '../shared';

const deleteParams = z.object({
  summary: toolSummarySchema.default('delete'),
  path: z.string().min(1).describe('要删除的文件或文件夹路径'),
  confirm: z.boolean().describe('必须为 true 才执行删除，防止误删'),
});

/**
 * 创建删除文件工具
 */
export const createDeleteTool = (capabilities: PlatformCapabilities, vaultUtils: VaultUtils) => {
  const { fs } = capabilities;

  return tool({
    name: 'delete',
    description:
      '删除文件或文件夹（递归）。执行前请先 read 确认内容，confirm 必须为 true 才能执行。',
    parameters: deleteParams,
    async execute({ path: targetPath, confirm }, _runContext?: RunContext<AgentContext>) {
      console.log('[tool] delete', { path: targetPath, confirm });

      if (!confirm) {
        throw new Error('删除操作需要 confirm: true 确认');
      }

      const resolved = await vaultUtils.resolvePath(targetPath);
      const stats = await fs.stat(resolved.absolute);

      await fs.delete(resolved.absolute);

      return {
        path: resolved.relative,
        type: stats.isDirectory ? 'folder' : 'file',
        deleted: true,
      };
    },
  });
};

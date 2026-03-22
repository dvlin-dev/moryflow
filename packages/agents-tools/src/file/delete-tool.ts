import { tool, type RunContext } from '@openai/agents-core';
import { z } from 'zod';
import type { PlatformCapabilities } from '@moryflow/agents-adapter';
import type { AgentContext, VaultUtils } from '@moryflow/agents-runtime';
import { toolSummarySchema } from '../shared';

const deleteParams = z.object({
  summary: toolSummarySchema.default('delete'),
  path: z.string().min(1).describe('Path of the file or folder to delete'),
  confirm: z.boolean().describe('Must be true to execute deletion — prevents accidental deletes'),
});

/**
 * 创建删除文件工具
 */
export const createDeleteTool = (capabilities: PlatformCapabilities, vaultUtils: VaultUtils) => {
  const { fs } = capabilities;

  return tool({
    name: 'delete',
    description: `Delete a file or folder (recursive). Read first to confirm content; confirm must be true to proceed.`,
    parameters: deleteParams,
    async execute({ path: targetPath, confirm }, runContext?: RunContext<AgentContext>) {
      console.log('[tool] delete', { path: targetPath, confirm });

      if (!confirm) {
        throw new Error('Deletion requires confirm: true');
      }

      const resolved = await vaultUtils.resolvePath(targetPath, runContext);
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

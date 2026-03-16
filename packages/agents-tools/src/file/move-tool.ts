import { tool, type RunContext } from '@openai/agents-core';
import { z } from 'zod';
import type { PlatformCapabilities } from '@moryflow/agents-adapter';
import type { AgentContext, VaultUtils } from '@moryflow/agents-runtime';
import { toolSummarySchema } from '../shared';

const moveParams = z.object({
  summary: toolSummarySchema.default('move'),
  from: z.string().min(1).describe('Source path'),
  to: z.string().min(1).describe('Destination path (full path including filename)'),
});

/**
 * 创建移动/重命名文件工具
 */
export const createMoveTool = (capabilities: PlatformCapabilities, vaultUtils: VaultUtils) => {
  const { fs } = capabilities;

  return tool({
    name: 'move',
    description:
      'Move or rename a file/folder. Same directory = rename; different directory = move.',
    parameters: moveParams,
    async execute({ from, to }, runContext?: RunContext<AgentContext>) {
      console.log('[tool] move', { from, to });

      const source = await vaultUtils.resolvePath(from, runContext);
      const stats = await fs.stat(source.absolute);

      // 解析目标路径
      const targetResolved = await vaultUtils.resolvePath(to, runContext);

      // 执行移动/重命名
      await fs.move(source.absolute, targetResolved.absolute);

      const newRelative = targetResolved.relative;

      return {
        from: source.relative,
        to: newRelative,
        type: stats.isDirectory ? 'folder' : 'file',
      };
    },
  });
};

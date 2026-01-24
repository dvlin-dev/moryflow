import { tool, type RunContext } from '@openai/agents-core';
import { z } from 'zod';
import type { PlatformCapabilities } from '@anyhunt/agents-adapter';
import type { AgentContext, VaultUtils } from '@anyhunt/agents-runtime';
import {
  BINARY_EXTENSIONS,
  LARGE_FILE_THRESHOLD,
  MAX_LINES,
  sliceLinesForReadTool,
  toolSummarySchema,
} from '../shared';

const readParams = z.object({
  summary: toolSummarySchema.default('read'),
  path: z.string().min(1, 'path 不能为空'),
  offset: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(MAX_LINES).optional(),
});

/**
 * 创建读取文件工具
 */
export const createReadTool = (capabilities: PlatformCapabilities, vaultUtils: VaultUtils) => {
  const { path: pathUtils } = capabilities;

  return tool({
    name: 'read',
    description:
      '读取笔记或配置文件的内容，支持 offset/limit 分段。若文件为二进制或体积过大则返回提示信息。',
    parameters: readParams,
    async execute({ path: targetPath, offset, limit }, _runContext?: RunContext<AgentContext>) {
      console.log('[tool] read', { path: targetPath, offset, limit });

      const data = await vaultUtils.readFile(targetPath);

      const ext = pathUtils.extname(data.absolute).toLowerCase();
      const looksBinary =
        BINARY_EXTENSIONS.has(ext) ||
        data.stats.size > LARGE_FILE_THRESHOLD ||
        data.content.includes('\u0000');

      if (looksBinary) {
        return {
          path: data.relative,
          size: data.stats.size,
          sha256: data.sha256,
          binary: true,
          note: '文件为二进制或过大，请使用合适的工具查看。',
          truncated: true,
        };
      }

      const lines = data.content.split(/\r?\n/);
      const result = sliceLinesForReadTool(lines, offset, limit);

      return {
        path: data.relative,
        size: data.stats.size,
        sha256: data.sha256,
        totalLines: lines.length,
        offset: result.offset,
        limit: result.limit,
        content: result.content,
        truncated: result.truncated,
      };
    },
  });
};

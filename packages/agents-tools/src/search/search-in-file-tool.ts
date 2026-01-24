import { tool, type RunContext } from '@openai/agents-core';
import { z } from 'zod';
import type { PlatformCapabilities } from '@anyhunt/agents-adapter';
import type { AgentContext, VaultUtils } from '@anyhunt/agents-runtime';
import { toolSummarySchema } from '../shared';

const searchInFileParams = z.object({
  summary: toolSummarySchema.default('search_in_file'),
  path: z.string().min(1).describe('文件路径'),
  query: z.string().min(1).describe('搜索的文本'),
  max_matches: z.number().int().min(1).max(100).default(20).describe('最大匹配数量'),
  case_sensitive: z.boolean().default(false).describe('是否区分大小写'),
});

/**
 * 创建文件内搜索工具
 */
export const createSearchInFileTool = (
  _capabilities: PlatformCapabilities,
  vaultUtils: VaultUtils
) => {
  return tool({
    name: 'search_in_file',
    description: '在指定文件内搜索文本并返回匹配行，帮助在长文档里定位段落后再调用 edit。',
    parameters: searchInFileParams,
    async execute(
      { path: targetPath, query, max_matches: maxMatches, case_sensitive: caseSensitive },
      _runContext?: RunContext<AgentContext>
    ) {
      console.log('[tool] search_in_file', {
        path: targetPath,
        query,
        maxMatches,
        caseSensitive,
      });

      const data = await vaultUtils.readFile(targetPath);

      const matches: Array<{ line: number; text: string }> = [];
      const comparator = caseSensitive ? query : query.toLowerCase();

      const lines = data.content.split(/\r?\n/);
      for (let index = 0; index < lines.length; index++) {
        if (matches.length >= maxMatches) {
          break;
        }

        const line = lines[index];
        const haystack = caseSensitive ? line : line.toLowerCase();

        if (haystack.includes(comparator)) {
          matches.push({ line: index + 1, text: line });
        }
      }

      return {
        path: data.relative,
        query,
        matches,
        totalMatches: matches.length,
      };
    },
  });
};

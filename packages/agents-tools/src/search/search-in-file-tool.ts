import { tool, type RunContext } from '@openai/agents-core';
import { z } from 'zod';
import type { PlatformCapabilities } from '@moryflow/agents-adapter';
import type { AgentContext, VaultUtils } from '@moryflow/agents-runtime';
import { toolSummarySchema } from '../shared';

const searchInFileParams = z.object({
  summary: toolSummarySchema.default('search_in_file'),
  path: z.string().min(1).describe('File path'),
  query: z.string().min(1).describe('Text to search for'),
  max_matches: z.number().int().min(1).max(100).default(20).describe('Maximum number of matches'),
  case_sensitive: z.boolean().default(false).describe('Case-sensitive search'),
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
    description:
      'Search for text within a specific file and return matching lines. Useful for locating sections in long documents before calling edit.',
    parameters: searchInFileParams,
    async execute(
      { path: targetPath, query, max_matches: maxMatches, case_sensitive: caseSensitive },
      runContext?: RunContext<AgentContext>
    ) {
      console.log('[tool] search_in_file', {
        path: targetPath,
        query,
        maxMatches,
        caseSensitive,
      });

      const data = await vaultUtils.readFile(targetPath, runContext);

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

import { tool, type RunContext } from '@openai/agents-core';
import { z } from 'zod';
import type { PlatformCapabilities } from '@moryflow/agents-adapter';
import {
  resolveSearchPatternsForMode,
  type AgentContext,
  type VaultUtils,
} from '@moryflow/agents-runtime';
import { toolSummarySchema } from '../shared';
import { getGlobImpl } from '../glob/glob-interface';

const grepParams = z.object({
  summary: toolSummarySchema.default('grep'),
  query: z.string().min(1).describe('Text to search for'),
  glob: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('File matching pattern, defaults to **/*.md'),
  limit: z.number().int().min(1).max(500).default(200).describe('Maximum number of matches'),
  case_sensitive: z.boolean().default(false).describe('Case-sensitive search'),
});

interface GrepMatch {
  path: string;
  line: number;
  preview: string;
}

/**
 * 创建 grep 搜索工具
 */
export const createGrepTool = (capabilities: PlatformCapabilities, vaultUtils: VaultUtils) => {
  const { fs, path: pathUtils } = capabilities;

  return tool({
    name: 'grep',
    description: `Search for text across files. Returns matching files, line numbers, and snippets — useful for locating references or specific content.`,
    parameters: grepParams,
    async execute(
      { query, glob, limit, case_sensitive: caseSensitive },
      runContext?: RunContext<AgentContext>
    ) {
      console.log('[tool] grep', { query, glob, limit, caseSensitive });

      const vaultRoot = await vaultUtils.getVaultRoot();
      const root = vaultRoot;

      // 解析 glob 模式
      const rawPatterns = Array.isArray(glob)
        ? glob.filter((value) => typeof value === 'string' && value.trim().length > 0)
        : typeof glob === 'string' && glob.trim().length > 0
          ? [glob.trim()]
          : ['**/*.md'];
      const resolved = resolveSearchPatternsForMode(rawPatterns, runContext, pathUtils);
      if (resolved.enforcedDecision === 'deny') {
        throw new Error(resolved.enforcedMessage ?? 'Search pattern escapes the current vault.');
      }
      const patterns = resolved.normalizedPatterns.filter((value) => value.length > 0);

      // 使用抽象的 glob 实现
      const globImpl = getGlobImpl();
      const files = await globImpl.glob({
        cwd: root,
        patterns,
        onlyFiles: true,
        dot: false,
      });

      const normalizedQuery = caseSensitive ? query : query.toLowerCase();
      const matches: GrepMatch[] = [];

      for (const matchedPath of files) {
        if (matches.length >= limit) {
          break;
        }

        const absolute = pathUtils.isAbsolute(matchedPath)
          ? pathUtils.normalize(matchedPath)
          : pathUtils.join(root, matchedPath);
        const outputPath = matchedPath.split(pathUtils.sep).join('/');
        let content: string;

        try {
          content = await fs.readFile(absolute, 'utf-8');
        } catch {
          continue;
        }

        const lines = content.split(/\r?\n/);
        for (let index = 0; index < lines.length; index++) {
          if (matches.length >= limit) {
            break;
          }

          const line = lines[index];
          const haystack = caseSensitive ? line : line.toLowerCase();

          if (haystack.includes(normalizedQuery)) {
            matches.push({
              path: outputPath,
              line: index + 1,
              preview: line.trim(),
            });
          }
        }
      }

      return {
        query,
        root,
        matches,
        totalMatches: matches.length,
        truncated: matches.length >= limit,
      };
    },
  });
};

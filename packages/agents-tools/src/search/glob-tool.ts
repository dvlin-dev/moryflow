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

const globParams = z.object({
  summary: toolSummarySchema.default('glob'),
  pattern: z.string().min(1).describe('Glob pattern, e.g. **/*.md'),
  max_results: z.number().int().min(1).max(1000).default(200).describe('Maximum number of results'),
  include_directories: z.boolean().default(false).describe('Include directories in results'),
});

/**
 * 创建 glob 搜索工具
 */
export const createGlobTool = (capabilities: PlatformCapabilities, vaultUtils: VaultUtils) => {
  const { fs, path: pathUtils } = capabilities;

  return tool({
    name: 'glob',
    description: `Find files or directories by glob pattern (e.g. **/*.md). Good for quickly filtering specific file types.`,
    parameters: globParams,
    async execute(
      { pattern, max_results: maxResults, include_directories: includeDirectories },
      runContext?: RunContext<AgentContext>
    ) {
      console.log('[tool] glob', { pattern, maxResults, includeDirectories });

      const vaultRoot = await vaultUtils.getVaultRoot();
      const root = vaultRoot;

      const resolved = resolveSearchPatternsForMode([pattern], runContext, pathUtils);
      if (resolved.enforcedDecision === 'deny') {
        throw new Error(resolved.enforcedMessage ?? 'Search pattern escapes the current vault.');
      }
      const normalized = resolved.normalizedPatterns[0];
      if (!normalized) {
        throw new Error('Search pattern cannot be empty.');
      }

      // 使用抽象的 glob 实现
      const globImpl = getGlobImpl();
      const entries = await globImpl.glob({
        cwd: root,
        patterns: [normalized],
        onlyFiles: !includeDirectories,
        dot: false,
        limit: maxResults,
      });

      const limited = entries.slice(0, maxResults);

      const items = await Promise.all(
        limited.map(async (matchedPath) => {
          const absolute = pathUtils.isAbsolute(matchedPath)
            ? pathUtils.normalize(matchedPath)
            : pathUtils.join(root, matchedPath);
          const outputPath = matchedPath.split(pathUtils.sep).join('/');
          try {
            const entryStats = await fs.stat(absolute);
            return {
              path: outputPath,
              type: entryStats.isDirectory ? 'folder' : 'file',
              size: entryStats.isFile ? entryStats.size : undefined,
              mtime: entryStats.mtime,
            };
          } catch {
            return {
              path: outputPath,
              type: 'unknown' as const,
            };
          }
        })
      );

      return {
        pattern: normalized,
        root,
        totalMatches: entries.length,
        matches: items,
        truncated: entries.length > limited.length,
      };
    },
  });
};

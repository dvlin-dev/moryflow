import { tool, type RunContext } from '@openai/agents-core';
import { z } from 'zod';
import type { PlatformCapabilities } from '@anyhunt/agents-adapter';
import type { AgentContext, VaultUtils } from '@anyhunt/agents-runtime';
import { toolSummarySchema } from '../shared';
import { getGlobImpl } from '../glob/glob-interface';

const grepParams = z.object({
  summary: toolSummarySchema.default('grep'),
  query: z.string().min(1).describe('搜索的文本'),
  glob: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('文件匹配模式，默认 **/*.md'),
  limit: z.number().int().min(1).max(500).default(200).describe('最大匹配数量'),
  case_sensitive: z.boolean().default(false).describe('是否区分大小写'),
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
    description: '跨文件搜索指定文本，返回匹配的文件、行号和内容片段，用于定位引用或查找特定内容。',
    parameters: grepParams,
    async execute(
      { query, glob, limit, case_sensitive: caseSensitive },
      _runContext?: RunContext<AgentContext>
    ) {
      console.log('[tool] grep', { query, glob, limit, caseSensitive });

      const root = await vaultUtils.getVaultRoot();

      // 解析 glob 模式
      const patterns = Array.isArray(glob)
        ? glob
        : typeof glob === 'string' && glob.trim().length > 0
          ? [glob.trim()]
          : ['**/*.md'];

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

      for (const relativePath of files) {
        if (matches.length >= limit) {
          break;
        }

        const absolute = pathUtils.join(root, relativePath);
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
              path: relativePath.split(pathUtils.sep).join('/'),
              line: index + 1,
              preview: line.trim(),
            });
          }
        }
      }

      return {
        query,
        matches,
        totalMatches: matches.length,
        truncated: matches.length >= limit,
      };
    },
  });
};

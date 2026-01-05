import { tool, type RunContext } from '@moryflow/agents'
import { z } from 'zod'
import type { PlatformCapabilities } from '@moryflow/agents-adapter'
import type { AgentContext, VaultUtils } from '@moryflow/agents-runtime'
import { toolSummarySchema } from '../shared'
import { getGlobImpl } from '../glob/glob-interface'

const globParams = z.object({
  summary: toolSummarySchema.default('glob'),
  pattern: z.string().min(1).describe('通配符模式，如 **/*.md'),
  max_results: z.number().int().min(1).max(1000).default(200).describe('最大返回数量'),
  include_directories: z.boolean().default(false).describe('是否包含目录'),
})

/**
 * 创建 glob 搜索工具
 */
export const createGlobTool = (
  capabilities: PlatformCapabilities,
  vaultUtils: VaultUtils
) => {
  const { fs, path: pathUtils } = capabilities

  return tool({
    name: 'glob',
    description:
      '使用通配符（如 **/*.md）按文件名模式查找文件或目录，适合快速筛选特定类型的文件。',
    parameters: globParams,
    async execute(
      { pattern, max_results: maxResults, include_directories: includeDirectories },
      _runContext?: RunContext<AgentContext>
    ) {
      console.log('[tool] glob', { pattern, maxResults, includeDirectories })

      const root = await vaultUtils.getVaultRoot()

      // 规范化 pattern，移除开头的 /
      const normalized = pattern.replace(/^\/+/, '')

      // 使用抽象的 glob 实现
      const globImpl = getGlobImpl()
      const entries = await globImpl.glob({
        cwd: root,
        patterns: [normalized],
        onlyFiles: !includeDirectories,
        dot: false,
        limit: maxResults,
      })

      const limited = entries.slice(0, maxResults)

      const items = await Promise.all(
        limited.map(async (relativePath) => {
          const absolute = pathUtils.join(root, relativePath)
          try {
            const entryStats = await fs.stat(absolute)
            return {
              path: relativePath.split(pathUtils.sep).join('/'),
              type: entryStats.isDirectory ? 'folder' : 'file',
              size: entryStats.isFile ? entryStats.size : undefined,
              mtime: entryStats.mtime,
            }
          } catch {
            return {
              path: relativePath.split(pathUtils.sep).join('/'),
              type: 'unknown' as const,
            }
          }
        })
      )

      return {
        pattern: normalized,
        totalMatches: entries.length,
        matches: items,
        truncated: entries.length > limited.length,
      }
    },
  })
}

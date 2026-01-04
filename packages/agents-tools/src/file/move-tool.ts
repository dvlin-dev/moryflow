import { tool, type RunContext } from '@aiget/agents'
import { z } from 'zod'
import type { PlatformCapabilities } from '@aiget/agents-adapter'
import type { AgentContext, VaultUtils } from '@aiget/agents-runtime'
import { toolSummarySchema, normalizeRelativePath } from '../shared'

const moveParams = z.object({
  summary: toolSummarySchema.default('move'),
  from: z.string().min(1).describe('源路径'),
  to: z.string().min(1).describe('目标路径（完整路径，包含文件名）'),
})

/**
 * 创建移动/重命名文件工具
 */
export const createMoveTool = (
  capabilities: PlatformCapabilities,
  vaultUtils: VaultUtils
) => {
  const { fs, path: pathUtils } = capabilities

  return tool({
    name: 'move',
    description:
      '移动或重命名文件/文件夹。同目录下改名即为重命名，不同目录即为移动。',
    parameters: moveParams,
    async execute(
      { from, to },
      _runContext?: RunContext<AgentContext>
    ) {
      console.log('[tool] move', { from, to })

      const source = await vaultUtils.resolvePath(from)
      const stats = await fs.stat(source.absolute)

      // 解析目标路径
      const targetResolved = await vaultUtils.resolvePath(to)

      // 执行移动/重命名
      await fs.move(source.absolute, targetResolved.absolute)

      const newRelative = normalizeRelativePath(
        source.root,
        targetResolved.absolute,
        pathUtils.sep
      )

      return {
        from: source.relative,
        to: newRelative,
        type: stats.isDirectory ? 'folder' : 'file',
      }
    },
  })
}

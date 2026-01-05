import { tool, type RunContext } from '@moryflow/agents'
import { createTwoFilesPatch } from 'diff'
import { z } from 'zod'
import type { PlatformCapabilities, CryptoUtils } from '@moryflow/agents-adapter'
import type { AgentContext, VaultUtils } from '@moryflow/agents-runtime'
import { toolSummarySchema, trimPreview } from '../shared'

const editParams = z.object({
  summary: toolSummarySchema.default('edit'),
  path: z.string().min(1),
  old_text: z.string().min(1).describe('要替换的原文本'),
  new_text: z.string().describe('替换后的新文本'),
  occurrence: z.number().int().min(1).default(1).describe('替换第几次出现（默认第一次）'),
})

/**
 * 创建编辑文件工具
 */
export const createEditTool = (
  capabilities: PlatformCapabilities,
  crypto: CryptoUtils,
  vaultUtils: VaultUtils
) => {
  const { fs } = capabilities

  return tool({
    name: 'edit',
    description:
      '在指定文件中以"查找文本 → 替换"的方式编辑，直接写入文件并返回 diff。编辑前请先 read 确认内容。',
    parameters: editParams,
    async execute(
      { path: targetPath, old_text: oldText, new_text: newText, occurrence },
      _runContext?: RunContext<AgentContext>
    ) {
      console.log('[tool] edit', { path: targetPath, occurrence })

      const data = await vaultUtils.readFile(targetPath)

      // 查找第 N 次出现
      let searchIndex = 0
      let foundIndex = -1
      for (let count = 0; count < occurrence; count += 1) {
        foundIndex = data.content.indexOf(oldText, searchIndex)
        if (foundIndex === -1) {
          throw new Error(`未找到第 ${occurrence} 次出现的 old_text，请先 read 校验文本`)
        }
        searchIndex = foundIndex + oldText.length
      }

      const before = data.content.slice(0, foundIndex)
      const after = data.content.slice(foundIndex + oldText.length)
      const updatedContent = `${before}${newText}${after}`

      // 直接写入文件
      await fs.writeFile(data.absolute, updatedContent)

      // 重新读取文件内容计算 sha256，确保与 read 工具一致
      // 因为某些文件系统（如 expo-file-system）的 text() 方法会去掉末尾换行符
      const actualContent = await fs.readFile(data.absolute)

      const patch = createTwoFilesPatch(
        data.relative,
        data.relative,
        data.content,
        actualContent
      )
      const preview = trimPreview(actualContent)
      const newSha256 = await crypto.sha256(actualContent)

      return {
        path: data.relative,
        sha256: newSha256,
        diff: patch,
        newSize: new TextEncoder().encode(actualContent).length,
        preview: preview.text,
        truncated: preview.truncated,
      }
    },
  })
}

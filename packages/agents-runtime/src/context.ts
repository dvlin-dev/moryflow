import type { AgentAttachmentContext, AgentChatContext } from './types'

/**
 * 将结构化上下文信息和附件注入到用户输入中
 */
export const applyContextToInput = (
  input: string,
  context?: AgentChatContext,
  attachments?: AgentAttachmentContext[]
): string => {
  const contextBlocks: string[] = []

  if (context?.filePath) {
    contextBlocks.push(`当前文件：${context.filePath}`)
  }

  if (context?.summary) {
    contextBlocks.push(`上下文摘要：\n${context.summary}`)
  }

  if (attachments && attachments.length > 0) {
    const chunks = attachments.map((attachment, index) => {
      const label =
        attachment.filename ||
        `附件 ${index + 1}${attachment.mediaType ? ` (${attachment.mediaType})` : ''}`
      const lines = [label]

      if (attachment.filePath) {
        lines.push(`已保存到 Vault 相对路径：${attachment.filePath}`)
        lines.push('如需查看完整内容，请调用 read_file 读取该路径。')
      }

      if (attachment.content) {
        const truncatedSuffix = attachment.truncated ? '\n...(附件内容部分截断)' : ''
        lines.push(`附件内容：\n${attachment.content}${truncatedSuffix}`)
      }

      return lines.join('\n')
    })

    contextBlocks.push(
      `以下为用户提供的附件信息，请在回答和操作前参阅：\n${chunks.join('\n\n')}`
    )
  }

  if (contextBlocks.length === 0) {
    return input
  }

  return `${contextBlocks.join('\n\n')}\n\n=== 用户输入 ===\n${input}`
}

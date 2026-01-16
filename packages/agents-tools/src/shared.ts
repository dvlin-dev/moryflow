import { z } from 'zod'

// 重新导出 runtime 包的 getVaultRootFromContext，避免重复定义
export { getVaultRootFromContext } from '@anyhunt/agents-runtime'

/**
 * 工具操作摘要 schema
 * AI 在调用工具时填写，用于前端展示"正在做什么"
 */
export const toolSummarySchema = z
  .string()
  .min(1)
  .max(80)
  .describe(
    'A brief one-sentence description of what you are doing. ' +
      "IMPORTANT: Use the same language as the user's conversation. " +
      'Examples: "Reading project config" (English), "读取项目配置" (Chinese)'
  )

/** 预览最大长度 */
export const MAX_PREVIEW_LENGTH = 32 * 1024

/** 二进制文件扩展名 */
export const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.svg',
  '.webp',
])

/** 大文件阈值 */
export const LARGE_FILE_THRESHOLD = MAX_PREVIEW_LENGTH * 8

/** 最大行数 */
export const MAX_LINES = 2000

/** 最大行长度 */
export const MAX_LINE_LENGTH = 2000

/**
 * 截断预览内容
 */
export const trimPreview = (content: string) => {
  if (content.length <= MAX_PREVIEW_LENGTH) {
    return { text: content, truncated: false }
  }
  return { text: content.slice(0, MAX_PREVIEW_LENGTH), truncated: true }
}

/**
 * 规范化相对路径（使用 / 分隔符）
 */
export const normalizeRelativePath = (
  root: string,
  absolutePath: string,
  pathSep: string
): string => {
  const relative = absolutePath.startsWith(root)
    ? absolutePath.slice(root.length).replace(/^[/\\]/, '')
    : absolutePath
  return relative.split(pathSep).join('/') || '.'
}

/**
 * 分片读取工具的行处理
 */
export const sliceLinesForReadTool = (
  lines: string[],
  offset?: number,
  limit?: number
): { content: string; offset: number; limit: number; truncated: boolean } => {
  const start = offset && offset > 0 ? offset - 1 : 0
  const clampedLimit = Math.min(limit ?? MAX_LINES, MAX_LINES)
  const end = Math.min(start + clampedLimit, lines.length)

  let lineTruncated = false
  const sliced = lines.slice(start, end).map((line) => {
    if (line.length > MAX_LINE_LENGTH) {
      lineTruncated = true
      return `${line.slice(0, MAX_LINE_LENGTH)}…[truncated]`
    }
    return line
  })

  const truncated = lineTruncated || start > 0 || end < lines.length

  return {
    content: sliced.join('\n'),
    offset: start + 1,
    limit: clampedLimit,
    truncated,
  }
}

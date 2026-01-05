/**
 * [PROVIDES]: 内容哈希计算工具
 * [DEPENDS]: 无外部依赖（使用 Web Crypto API）
 * [POS]: 用于检测文件内容变更
 */

/**
 * 计算 ArrayBuffer 的 SHA-256 哈希（Web 环境）
 */
export async function computeHashAsync(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return bufferToHex(hashBuffer)
}

/**
 * 计算 Uint8Array 的 SHA-256 哈希（Web 环境）
 */
export async function computeHashFromBytes(bytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  return bufferToHex(hashBuffer)
}

/**
 * Buffer 转十六进制字符串
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 从文件路径提取标题（文件名不含扩展名）
 */
export function extractTitle(filePath: string): string {
  const lastSlashIndex = filePath.lastIndexOf('/')
  const fileName = lastSlashIndex !== -1 ? filePath.substring(lastSlashIndex + 1) : filePath
  const lastDotIndex = fileName.lastIndexOf('.')
  return lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName
}

/**
 * 判断是否为 Markdown 文件
 */
export function isMarkdownFile(filePath: string): boolean {
  const lower = filePath.toLowerCase()
  return lower.endsWith('.md') || lower.endsWith('.markdown')
}

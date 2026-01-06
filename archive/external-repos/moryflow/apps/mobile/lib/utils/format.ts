/**
 * 格式化工具函数
 */

/**
 * 获取文件扩展名（小写）
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1 || lastDot === 0) return ''
  return filename.slice(lastDot + 1).toLowerCase()
}

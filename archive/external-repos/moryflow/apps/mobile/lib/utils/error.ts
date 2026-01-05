/**
 * 错误处理工具函数
 */

/**
 * 安全地记录错误到控制台
 */
export function logError(context: string, error: unknown): void {
  const errorInfo =
    typeof error === 'object' && error !== null && 'message' in error
      ? { message: (error as { message: string }).message }
      : error

  console.error(`[${context}]`, errorInfo)
}

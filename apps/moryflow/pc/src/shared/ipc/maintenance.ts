/**
 * 重置软件设置的请求/响应类型
 */
export type ResetAppRequest = Record<string, never>

export type ResetAppResult = {
  success: boolean
  error?: string
}

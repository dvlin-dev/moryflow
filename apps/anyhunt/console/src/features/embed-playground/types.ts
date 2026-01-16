/**
 * Embed Playground 类型定义
 */
import type { EmbedData, EmbedTheme } from '@anyhunt/embed-react'

/** Embed 请求表单数据 */
export interface EmbedFormData {
  url: string
  maxWidth?: number
  maxHeight?: number
  theme?: EmbedTheme
}

/** Embed 响应结果 */
export interface EmbedResult {
  data: EmbedData
  provider: string
  cached: boolean
}

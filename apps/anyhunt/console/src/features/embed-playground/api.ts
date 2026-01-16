/**
 * Embed API 调用
 */
import { apiClient } from '@/lib/api-client'
import { CONSOLE_API } from '@/lib/api-paths'
import type { EmbedFormData, EmbedResult } from './types'

interface EmbedApiResponse {
  data: EmbedResult['data']
  meta: {
    provider: string
    cached: boolean
  }
}

/**
 * 获取 oEmbed 数据
 */
export async function fetchEmbed(
  apiKeyId: string,
  request: EmbedFormData
): Promise<EmbedResult> {
  const response = await apiClient.post<EmbedApiResponse>(CONSOLE_API.OEMBED, {
    apiKeyId,
    url: request.url,
    maxwidth: request.maxWidth,
    maxheight: request.maxHeight,
    theme: request.theme,
  })

  return {
    data: response.data,
    provider: response.meta.provider,
    cached: response.meta.cached,
  }
}

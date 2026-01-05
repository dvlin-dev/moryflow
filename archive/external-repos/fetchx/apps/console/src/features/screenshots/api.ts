/**
 * Screenshots API
 */
import { apiClient } from '@/lib/api-client'
import { CONSOLE_API } from '@/lib/api-paths'
import type { Screenshot, ScreenshotListResponse, ScreenshotListParams } from './types'

/**
 * 获取截图列表
 */
export async function getScreenshots(params?: ScreenshotListParams): Promise<ScreenshotListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.status) searchParams.set('status', params.status)

  const query = searchParams.toString()
  const url = query ? `${CONSOLE_API.SCREENSHOTS}?${query}` : CONSOLE_API.SCREENSHOTS

  return apiClient.get<ScreenshotListResponse>(url)
}

/**
 * 获取单个截图详情
 */
export async function getScreenshot(id: string): Promise<Screenshot> {
  return apiClient.get<Screenshot>(`${CONSOLE_API.SCREENSHOTS}/${id}`)
}

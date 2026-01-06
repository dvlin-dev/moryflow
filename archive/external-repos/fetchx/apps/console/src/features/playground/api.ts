/**
 * Playground API
 * 截图 API 调用 - 通过控制台代理
 */

import { apiClient } from '@/lib/api-client'
import { CONSOLE_API } from '@/lib/api-paths'
import type { ScreenshotRequest, ScreenshotResponse } from './types'

/**
 * 调用截图 API
 * 通过控制台代理使用会话认证
 * 选择的 API Key ID 用于确定使用哪个 Key 的配额
 */
export async function takeScreenshot(
  apiKeyId: string,
  request: ScreenshotRequest
): Promise<ScreenshotResponse> {
  return apiClient.post<ScreenshotResponse>(CONSOLE_API.SCREENSHOT, {
    apiKeyId,
    ...request,
  })
}

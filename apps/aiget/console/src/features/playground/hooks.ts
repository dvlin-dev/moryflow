/**
 * Playground Hooks
 */
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { takeScreenshot } from './api'
import type { ScreenshotRequest, ScreenshotResponse } from './types'

interface TakeScreenshotParams {
  apiKeyId: string
  request: ScreenshotRequest
}

/** 截图 mutation */
export function useTakeScreenshot() {
  return useMutation({
    mutationFn: ({ apiKeyId, request }: TakeScreenshotParams) =>
      takeScreenshot(apiKeyId, request),
    onError: (error: Error) => {
      toast.error(error.message || 'Screenshot failed')
    },
  })
}

/** 解析截图响应，判断成功或失败 */
export function isScreenshotSuccess(
  response: ScreenshotResponse
): response is ScreenshotResponse & { success: true } {
  return response.success === true
}

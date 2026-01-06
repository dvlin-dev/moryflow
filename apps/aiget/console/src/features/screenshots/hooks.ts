/**
 * Screenshots React Query hooks
 */
import { useQuery } from '@tanstack/react-query'
import { getScreenshots, getScreenshot } from './api'
import type { ScreenshotListParams } from './types'

export const screenshotKeys = {
  all: ['screenshots'] as const,
  lists: () => [...screenshotKeys.all, 'list'] as const,
  list: (params?: ScreenshotListParams) => [...screenshotKeys.lists(), params] as const,
  details: () => [...screenshotKeys.all, 'detail'] as const,
  detail: (id: string) => [...screenshotKeys.details(), id] as const,
}

/**
 * 获取截图列表
 */
export function useScreenshots(params?: ScreenshotListParams) {
  return useQuery({
    queryKey: screenshotKeys.list(params),
    queryFn: () => getScreenshots(params),
  })
}

/**
 * 获取单个截图详情
 */
export function useScreenshot(id: string) {
  return useQuery({
    queryKey: screenshotKeys.detail(id),
    queryFn: () => getScreenshot(id),
    enabled: !!id,
  })
}

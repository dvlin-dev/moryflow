/**
 * Screenshots 类型定义
 */

export type ScreenshotStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface Screenshot {
  id: string
  userId: string
  apiKeyId: string | null
  url: string
  status: ScreenshotStatus
  fileUrl: string | null
  fileSize: number | null
  fileExpiresAt: string | null
  processingMs: number | null
  pageTitle: string | null
  pageDesc: string | null
  pageFavicon: string | null
  fromCache: boolean
  error: string | null
  createdAt: string
  completedAt: string | null
}

export interface ScreenshotListResponse {
  data: Screenshot[]
  total: number
  page: number
  limit: number
}

export interface ScreenshotListParams {
  page?: number
  limit?: number
  status?: ScreenshotStatus
}

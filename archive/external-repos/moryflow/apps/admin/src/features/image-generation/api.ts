/**
 * 图片生成 API
 * 调用 AI Image 的图片生成接口
 */

import { apiClient, ApiError } from '@/lib/api-client'
import { AI_PROXY_API } from '@/lib/api-paths'

/** 图片生成请求 */
export interface ImageGenerationRequest {
  model?: string
  prompt: string
  n?: number
  size?: string
  quality?: string
  // gpt-image-1.5 参数
  background?: string
  output_format?: string
  // z-image-turbo / seedream 参数
  seed?: number
  enable_safety_checker?: boolean
}

/** 单张图片数据 */
export interface ImageData {
  url?: string
  b64_json?: string
}

/** 图片生成响应 */
export interface ImageGenerationResponse {
  created: number
  data: ImageData[]
}

// Re-export ApiError for backward compatibility
export { ApiError as ImageApiError }

/**
 * 调用图片生成 API
 */
export async function generateImage(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  return apiClient.post<ImageGenerationResponse>(
    AI_PROXY_API.IMAGES_GENERATIONS,
    request
  )
}

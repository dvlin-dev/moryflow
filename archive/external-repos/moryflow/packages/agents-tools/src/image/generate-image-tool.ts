/**
 * [PROVIDES]: createGenerateImageTool - AI 图片生成工具
 * [DEPENDS]: @moryflow/agents, @moryflow/agents-adapter
 * [POS]: Agent 工具，调用后端 /v1/images/generations 生成图片
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { tool } from '@moryflow/agents'
import { z } from 'zod'
import type { PlatformCapabilities } from '@moryflow/agents-adapter'
import { toolSummarySchema } from '../shared'

const MAX_IMAGES = 10

const generateImageParams = z.object({
  summary: toolSummarySchema.default('generate_image'),
  prompt: z
    .string()
    .min(1)
    .describe('Image description. Describe in detail what you want to generate. NSFW allowed but NO explicit genitalia. Prohibited: violence, gore, minors, hate speech, politically sensitive content.'),
  n: z
    .number()
    .int()
    .min(1)
    .max(MAX_IMAGES)
    .default(1)
    .describe('Number of images to generate. Default 1, max 10.'),
  size: z
    .enum(['1024x1024', '1536x1024', '1024x1536'])
    .default('1024x1024')
    .describe('Image size: 1024x1024 (square), 1536x1024 (landscape), 1024x1536 (portrait).'),
})

interface ImageGenerationResponse {
  created: number
  data: Array<{ url?: string; b64_json?: string }>
}

/**
 * 创建图片生成工具
 */
export const createGenerateImageTool = (capabilities: PlatformCapabilities) => {
  const { fetch: fetchFn, auth } = capabilities

  return tool({
    name: 'generate_image',
    description:
      'Generate images using AI. Creates high-quality images from text descriptions. NSFW content is allowed but NO explicit genitalia. Violence, gore, minors, hate speech, and politically sensitive content are strictly prohibited.',
    parameters: generateImageParams,
    async execute({ prompt, n = 1, size = '1024x1024' }) {
      const token = await auth.getToken()
      if (!token) {
        return {
          success: false,
          error: 'Not logged in. Please sign in to generate images.',
        }
      }

      try {
        const response = await fetchFn(`${auth.getApiUrl()}/v1/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            model: 'z-image-turbo',
            prompt,
            n: Math.min(n, MAX_IMAGES),
            size,
            quality: 'high',
          }),
        })

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as { message?: string }
          const message = errorData.message || `Request failed (${response.status})`

          if (response.status === 401) {
            return { success: false, error: 'Session expired. Please sign in again.' }
          }
          if (response.status === 402) {
            return { success: false, error: 'Insufficient credits. Please top up to continue.' }
          }

          return { success: false, error: message }
        }

        const result = (await response.json()) as ImageGenerationResponse

        const images = result.data
          .filter((img) => img.url)
          .map((img, index) => ({
            index: index + 1,
            url: img.url!,
          }))

        if (images.length === 0) {
          return { success: false, error: 'Image generation failed. No valid data returned.' }
        }

        return {
          success: true,
          prompt,
          count: images.length,
          images,
          note:
            images.length === 1
              ? 'Image generated successfully. Use the URL to display or save.'
              : `Generated ${images.length} images. Display or save as needed.`,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return {
          success: false,
          error: `Generation failed: ${message}`,
        }
      }
    },
  })
}

/**
 * [PROVIDES]: 图片文件处理
 * [POS]: 读取并编码图片文件为 Base64
 */

import * as fs from 'fs/promises'
import * as path from 'path'

/** 读取并编码图片文件为 Base64 */
export async function readImageAsBase64(imagePath: string): Promise<{
  content: string
  contentType: string
} | null> {
  try {
    const ext = path.extname(imagePath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    }

    const contentType = mimeTypes[ext] || 'application/octet-stream'
    const buffer = await fs.readFile(imagePath)
    const content = buffer.toString('base64')

    return { content, contentType }
  } catch {
    return null
  }
}

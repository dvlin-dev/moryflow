/**
 * [PROVIDES]: transcribeAudio, SpeechError
 * [DEPENDS]: /api, lib/server/storage
 * [POS]: 语音转录辅助函数，将本地音频文件上传到服务端进行转录
 */

import { MEMBERSHIP_API_URL } from '@anyhunt/api'
import { getStoredToken } from '@/lib/server/storage'

// ==================== 类型定义 ====================

/** 转录响应 */
interface TranscribeResponse {
  id: string
  text: string
  rawText: string
  duration: number
  rawAudio: string | null
}

/** 转录错误码 */
type SpeechErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'TRANSCRIPTION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'FILE_ERROR'

// ==================== 常量 ====================

/** 转录请求超时时间（60秒） */
const TRANSCRIBE_TIMEOUT_MS = 60_000

// ==================== 错误类 ====================

export class SpeechError extends Error {
  constructor(
    message: string,
    public readonly code: SpeechErrorCode,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'SpeechError'
  }
}

// ==================== 主函数 ====================

/**
 * 转录音频文件
 * @param uri 本地音频文件 URI (file://)
 * @returns 转录后的文本
 */
export async function transcribeAudio(uri: string): Promise<string> {
  // 获取认证 token
  const token = await getStoredToken()
  if (!token) {
    throw new SpeechError('Not logged in, please sign in first', 'AUTH_ERROR')
  }

  // 构造文件名
  const fileName = `recording-${Date.now()}.m4a`

  // 创建 FormData
  // React Native 的 fetch 支持直接传入 uri
  const formData = new FormData()
  formData.append('audio', {
    uri,
    name: fileName,
    type: 'audio/mp4',
  } as unknown as Blob)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS)

  try {
    const response = await fetch(`${MEMBERSHIP_API_URL}/api/speech/transcribe`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // 注意：不要手动设置 Content-Type，让 fetch 自动处理 multipart/form-data
      },
      body: formData,
      signal: controller.signal,
    })

    if (!response.ok) {
      // 认证错误
      if (response.status === 401) {
        throw new SpeechError('Session expired, please sign in again', 'AUTH_ERROR')
      }
      // 业务错误
      const error = await response.json().catch(() => ({ message: 'Transcription failed' }))
      throw new SpeechError(error.message || 'Transcription failed', 'TRANSCRIPTION_ERROR')
    }

    const result: TranscribeResponse = await response.json()
    return result.text
  } catch (error) {
    // 已经是 SpeechError 直接抛出
    if (error instanceof SpeechError) {
      throw error
    }
    // 超时错误
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new SpeechError('Request timeout, please check your network', 'TIMEOUT_ERROR', error)
    }
    // 网络错误
    if (error instanceof TypeError) {
      throw new SpeechError('Network connection failed, please check your network settings', 'NETWORK_ERROR', error)
    }
    throw new SpeechError('Transcription failed, please try again later', 'TRANSCRIPTION_ERROR', error)
  } finally {
    clearTimeout(timeoutId)
  }
}

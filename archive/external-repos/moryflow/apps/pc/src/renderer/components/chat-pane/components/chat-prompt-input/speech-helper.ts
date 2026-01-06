/**
 * 语音输入辅助函数
 * 处理音频录制和转录
 */

import { MEMBERSHIP_API_URL } from '@/lib/server/const'
import { getStoredToken } from '@/lib/server/client'

/** 支持的音频 MIME 类型 */
const SUPPORTED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
]

/**
 * 获取浏览器支持的最佳音频 MIME 类型
 */
export function getSupportedMimeType(): string {
  for (const mimeType of SUPPORTED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType
    }
  }
  return 'audio/webm'
}

/**
 * 从 MIME 类型获取文件扩展名
 */
export function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

/** 转录响应 */
interface TranscribeResponse {
  id: string
  text: string
  rawText: string
  duration: number
  rawAudio: string | null
}

/** 转录选项 */
interface TranscribeOptions {
  /** 音频 Blob */
  audioBlob: Blob
  /** MIME 类型 */
  mimeType: string
  /** 是否保存原始音频到服务器 */
  saveRawAudio?: boolean
}

/**
 * 获取服务器 API 基础 URL
 */
function getApiBaseUrl(): string {
  return MEMBERSHIP_API_URL
}

/** 转录请求超时时间（60秒，考虑大文件上传和处理时间） */
const TRANSCRIBE_TIMEOUT_MS = 60_000

/** 语音转录错误 */
export class SpeechError extends Error {
  constructor(
    message: string,
    public readonly code: 'NETWORK_ERROR' | 'AUTH_ERROR' | 'TRANSCRIPTION_ERROR' | 'TIMEOUT_ERROR',
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'SpeechError'
  }
}

/**
 * 转录音频文件
 * 直接发送音频文件到服务器进行转录
 */
export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscribeResponse> {
  const { audioBlob, mimeType, saveRawAudio = false } = options

  // 构造文件名
  const extension = getExtensionFromMimeType(mimeType)
  const fileName = `recording-${Date.now()}.${extension}`

  // 创建 FormData
  const formData = new FormData()
  formData.append('audio', audioBlob, fileName)
  if (saveRawAudio) {
    formData.append('rawAudio', 'true')
  }

  // 获取认证 token
  const token = getStoredToken()
  if (!token) {
    throw new SpeechError('未登录，请先登录后再试', 'AUTH_ERROR')
  }

  const baseUrl = getApiBaseUrl()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}/api/speech/transcribe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    })

    if (!response.ok) {
      // 认证错误
      if (response.status === 401) {
        throw new SpeechError('登录已过期，请重新登录', 'AUTH_ERROR')
      }
      // 业务错误
      const error = await response.json().catch(() => ({ message: '转录失败' }))
      throw new SpeechError(error.message || '转录失败', 'TRANSCRIPTION_ERROR')
    }

    return response.json()
  } catch (error) {
    // 已经是 SpeechError 直接抛出
    if (error instanceof SpeechError) {
      throw error
    }
    // 超时错误
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new SpeechError('请求超时，请检查网络后重试', 'TIMEOUT_ERROR', error)
    }
    // 网络错误
    if (error instanceof TypeError) {
      throw new SpeechError('网络连接失败，请检查网络设置', 'NETWORK_ERROR', error)
    }
    throw new SpeechError('转录失败，请稍后重试', 'TRANSCRIPTION_ERROR', error)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 格式化录音时长（秒 → MM:SS）
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

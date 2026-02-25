/**
 * [PROVIDES]: transcribeAudio, SpeechError
 * [DEPENDS]: /api, lib/server/auth-session
 * [POS]: 语音转录辅助函数，将本地音频文件上传到服务端进行转录
 */

import { MEMBERSHIP_API_URL } from '@moryflow/api';
import { createApiClient, createApiTransport, ServerApiError } from '@moryflow/api/client';
import { getAccessToken, refreshAccessToken } from '@/lib/server/auth-session';

// ==================== 类型定义 ====================

/** 转录响应 */
interface TranscribeResponse {
  id: string;
  text: string;
  rawText: string;
  duration: number;
  rawAudio: string | null;
}

/** 转录错误码 */
type SpeechErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'TRANSCRIPTION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'FILE_ERROR';

// ==================== 常量 ====================

/** 转录请求超时时间（60秒） */
const TRANSCRIBE_TIMEOUT_MS = 60_000;

const speechApiClient = createApiClient({
  transport: createApiTransport({
    baseUrl: MEMBERSHIP_API_URL,
  }),
  defaultAuthMode: 'bearer',
  getAccessToken,
  onUnauthorized: refreshAccessToken,
});

// ==================== 错误类 ====================

export class SpeechError extends Error {
  constructor(
    message: string,
    public readonly code: SpeechErrorCode,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'SpeechError';
  }
}

// ==================== 主函数 ====================

/**
 * 转录音频文件
 * @param uri 本地音频文件 URI (file://)
 * @returns 转录后的文本
 */
export async function transcribeAudio(uri: string): Promise<string> {
  let token = getAccessToken();
  if (!token) {
    const refreshed = await refreshAccessToken();
    token = refreshed ? getAccessToken() : null;
  }
  if (!token) {
    throw new SpeechError('Not logged in, please sign in first', 'AUTH_ERROR');
  }

  const fileName = `recording-${Date.now()}.m4a`;
  const formData = new FormData();
  formData.append('audio', {
    uri,
    name: fileName,
    type: 'audio/mp4',
  } as unknown as Blob);

  try {
    const result = await speechApiClient.post<TranscribeResponse>('/api/v1/speech/transcribe', {
      body: formData,
      timeoutMs: TRANSCRIBE_TIMEOUT_MS,
    });
    return result.text;
  } catch (error) {
    if (error instanceof SpeechError) {
      throw error;
    }
    if (error instanceof ServerApiError) {
      if (error.status === 401) {
        throw new SpeechError('Session expired, please sign in again', 'AUTH_ERROR', error);
      }
      throw new SpeechError(error.message || 'Transcription failed', 'TRANSCRIPTION_ERROR', error);
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new SpeechError('Request timeout, please check your network', 'TIMEOUT_ERROR', error);
    }
    if (error instanceof TypeError) {
      throw new SpeechError(
        'Network connection failed, please check your network settings',
        'NETWORK_ERROR',
        error
      );
    }
    throw new SpeechError(
      'Transcription failed, please try again later',
      'TRANSCRIPTION_ERROR',
      error
    );
  }
}

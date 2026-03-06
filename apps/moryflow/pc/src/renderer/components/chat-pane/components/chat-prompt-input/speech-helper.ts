/**
 * [PROVIDES]: 语音录制与转录辅助函数
 * [DEPENDS]: MEMBERSHIP_API_URL, getAccessToken
 * [POS]: Chat Prompt Input 语音流程工具
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { MEMBERSHIP_API_URL } from '@/lib/server/const';
import { getAccessToken, refreshAccessToken } from '@/lib/server';
import { createApiClient, createApiTransport, ServerApiError } from '@moryflow/api/client';

/** 支持的音频 MIME 类型 */
const SUPPORTED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

/**
 * 获取浏览器支持的最佳音频 MIME 类型
 */
export function getSupportedMimeType(): string {
  for (const mimeType of SUPPORTED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  return 'audio/webm';
}

/**
 * 从 MIME 类型获取文件扩展名
 */
export function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

/** 转录响应 */
interface TranscribeResponse {
  id: string;
  text: string;
  rawText: string;
  duration: number;
  rawAudio: string | null;
}

/** 转录选项 */
interface TranscribeOptions {
  /** 音频 Blob */
  audioBlob: Blob;
  /** MIME 类型 */
  mimeType: string;
  /** 是否保存原始音频到服务器 */
  saveRawAudio?: boolean;
}

/**
 * 获取服务器 API 基础 URL
 */
function getApiBaseUrl(): string {
  return MEMBERSHIP_API_URL;
}

function createSpeechApiClient() {
  return createApiClient({
    transport: createApiTransport({
      baseUrl: getApiBaseUrl(),
    }),
    defaultAuthMode: 'bearer',
    getAccessToken,
    onUnauthorized: refreshAccessToken,
  });
}

/** 转录请求超时时间（60秒，考虑大文件上传和处理时间） */
const TRANSCRIBE_TIMEOUT_MS = 60_000;

/** 语音转录错误 */
export class SpeechError extends Error {
  constructor(
    message: string,
    public readonly code: 'NETWORK_ERROR' | 'AUTH_ERROR' | 'TRANSCRIPTION_ERROR' | 'TIMEOUT_ERROR',
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'SpeechError';
  }
}

/**
 * 转录音频文件
 * 直接发送音频文件到服务器进行转录
 */
export async function transcribeAudio(options: TranscribeOptions): Promise<TranscribeResponse> {
  const { audioBlob, mimeType, saveRawAudio = false } = options;

  // 构造文件名
  const extension = getExtensionFromMimeType(mimeType);
  const fileName = `recording-${Date.now()}.${extension}`;

  // 创建 FormData
  const formData = new FormData();
  formData.append('audio', audioBlob, fileName);
  if (saveRawAudio) {
    formData.append('rawAudio', 'true');
  }

  // 获取认证 token
  const token = getAccessToken();
  if (!token) {
    throw new SpeechError('Please sign in to use voice transcription.', 'AUTH_ERROR');
  }

  const speechApiClient = createSpeechApiClient();

  try {
    return await speechApiClient.post<TranscribeResponse>('/api/v1/speech/transcribe', {
      body: formData,
      timeoutMs: TRANSCRIBE_TIMEOUT_MS,
    });
  } catch (error) {
    // 已经是 SpeechError 直接抛出
    if (error instanceof SpeechError) {
      throw error;
    }
    if (error instanceof ServerApiError) {
      if (error.status === 401) {
        throw new SpeechError('Your session expired. Please sign in again.', 'AUTH_ERROR', error);
      }
      throw new SpeechError(error.message || 'Transcription failed', 'TRANSCRIPTION_ERROR', error);
    }
    // 超时错误
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new SpeechError(
        'Request timed out. Please check your connection and try again.',
        'TIMEOUT_ERROR',
        error
      );
    }
    // 网络错误
    if (error instanceof TypeError) {
      throw new SpeechError('Network error. Please check your connection.', 'NETWORK_ERROR', error);
    }
    throw new SpeechError(
      'Transcription failed. Please try again later.',
      'TRANSCRIPTION_ERROR',
      error
    );
  }
}

/**
 * 格式化录音时长（秒 → MM:SS）
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

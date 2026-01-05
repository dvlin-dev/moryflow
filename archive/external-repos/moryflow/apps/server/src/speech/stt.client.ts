/**
 * STT Client
 * 语音转文字客户端，当前使用 OpenAI gpt-4o-mini-transcribe
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

// ==================== 类型定义 ====================

export interface STTTranscriptionResult {
  /** 转录文本 */
  text: string;
}

export interface STTTranscriptionOptions {
  /** 音频文件 Buffer */
  audioBuffer: Buffer;
  /** 音频 MIME 类型（如 audio/webm;codecs=opus） */
  mimeType: string;
  /** 可选提示词，用于提高特定词汇的识别准确性 */
  prompt?: string;
}

// ==================== 异常类型 ====================

export enum STTErrorCode {
  /** 未配置 */
  NOT_CONFIGURED = 'STT_NOT_CONFIGURED',
  /** 转录失败 */
  TRANSCRIPTION_FAILED = 'STT_TRANSCRIPTION_FAILED',
  /** 文件过大 */
  FILE_TOO_LARGE = 'STT_FILE_TOO_LARGE',
  /** 格式不支持 */
  UNSUPPORTED_FORMAT = 'STT_UNSUPPORTED_FORMAT',
}

export class STTException extends Error {
  constructor(
    message: string,
    public readonly code: STTErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'STTException';
  }
}

// ==================== 服务实现 ====================

@Injectable()
export class STTClient {
  private readonly logger = new Logger(STTClient.name);
  private client: OpenAI | null = null;
  private readonly apiKey: string;
  private readonly baseUrl: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY', '');
    this.baseUrl = this.configService.get<string>('OPENAI_BASE_URL');
  }

  /**
   * 获取 OpenAI 客户端（延迟初始化）
   */
  private getClient(): OpenAI {
    if (!this.client) {
      if (!this.isConfigured()) {
        throw new STTException(
          'OpenAI API is not configured',
          STTErrorCode.NOT_CONFIGURED,
        );
      }

      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseUrl,
      });

      this.logger.log('STT client initialized (OpenAI)');
    }
    return this.client;
  }

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * 转录音频文件
   * 使用 gpt-4o-mini-transcribe 模型
   * 支持格式: mp3, mp4, mpeg, mpga, m4a, wav, webm
   * 文件大小限制: 25MB
   */
  async transcribe(
    options: STTTranscriptionOptions,
  ): Promise<STTTranscriptionResult> {
    const { audioBuffer, mimeType, prompt } = options;

    this.logger.debug(
      `Transcribing audio: ${audioBuffer.length} bytes, type: ${mimeType}`,
    );

    try {
      // 使用传入的 mimeType 构造文件名
      const extension = this.getExtensionFromMimeType(mimeType);
      const fileName = `audio.${extension}`;

      // 创建 File 对象（使用基础 MIME 类型，去掉 codec 参数）
      const baseMimeType = mimeType.split(';')[0].trim();
      const audioBlob = new Blob([new Uint8Array(audioBuffer)]);
      const audioFile = new File([audioBlob], fileName, {
        type: baseMimeType,
      });

      const client = this.getClient();
      const transcription = await client.audio.transcriptions.create({
        file: audioFile,
        model: 'gpt-4o-mini-transcribe',
        ...(prompt && { prompt }),
      });

      this.logger.debug('Transcription completed');

      return {
        text: transcription.text,
      };
    } catch (error) {
      if (error instanceof STTException) {
        throw error;
      }

      // 处理 OpenAI API 错误
      if (error instanceof OpenAI.APIError) {
        this.logger.error(`OpenAI API error: ${error.message}`, error);

        // 文件过大错误
        if (error.status === 413 || error.message.includes('too large')) {
          throw new STTException(
            'Audio file is too large. Maximum size is 25MB.',
            STTErrorCode.FILE_TOO_LARGE,
            error,
          );
        }

        // 格式不支持错误
        if (error.status === 400 && error.message.includes('format')) {
          throw new STTException(
            'Audio format is not supported. Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm',
            STTErrorCode.UNSUPPORTED_FORMAT,
            error,
          );
        }
      }

      this.logger.error('Transcription failed', error);
      throw new STTException(
        `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        STTErrorCode.TRANSCRIPTION_FAILED,
        error,
      );
    }
  }

  /**
   * 从 MIME 类型获取文件扩展名
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const baseMimeType = mimeType.split(';')[0].trim();
    const mimeToExt: Record<string, string> = {
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/mpga': 'mp3',
      'audio/mp4': 'm4a',
      'audio/m4a': 'm4a',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
    };
    return mimeToExt[baseMimeType] || 'webm';
  }
}

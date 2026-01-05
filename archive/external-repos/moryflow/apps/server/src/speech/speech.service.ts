/**
 * Speech Service
 * 语音转录业务逻辑
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma';
import { R2Service } from '../storage/r2.service';
import { ActivityLogService } from '../activity-log';
import { STTClient, STTException } from './stt.client';
import { TextRefinerService } from './text-refiner.service';
import type { TranscribeResponseDto } from './dto';

// ==================== 常量 ====================

/** 音频文件专用 vaultId */
const AUDIO_VAULT_ID = '00000000-0000-0000-0000-000000000001';

/** 支持的音频格式（OpenAI STT 支持） */
const SUPPORTED_AUDIO_TYPES = [
  'audio/mp3',
  'audio/mpeg',
  'audio/mpga',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/webm',
];

/** MIME 类型规范化映射（处理非标准 MIME 类型） */
const MIME_TYPE_NORMALIZATION: Record<string, string> = {
  'audio/xm4a': 'audio/mp4', // React Native iOS FormData bug
  'audio/x-m4a': 'audio/mp4',
};

// ==================== 异常类型 ====================

export enum SpeechErrorCode {
  /** 未配置 */
  NOT_CONFIGURED = 'SPEECH_NOT_CONFIGURED',
  /** 不支持的格式 */
  UNSUPPORTED_FORMAT = 'SPEECH_UNSUPPORTED_FORMAT',
  /** 文件未找到 */
  FILE_NOT_FOUND = 'SPEECH_FILE_NOT_FOUND',
  /** 转录失败 */
  TRANSCRIPTION_FAILED = 'SPEECH_TRANSCRIPTION_FAILED',
  /** 文件过大 */
  FILE_TOO_LARGE = 'SPEECH_FILE_TOO_LARGE',
}

export class SpeechException extends Error {
  constructor(
    message: string,
    public readonly code: SpeechErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SpeechException';
  }
}

// ==================== 服务实现 ====================

@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);
  private readonly serverUrl: string;
  private readonly maxFileSize: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly r2Service: R2Service,
    private readonly activityLogService: ActivityLogService,
    private readonly sttClient: STTClient,
    private readonly textRefiner: TextRefinerService,
  ) {
    this.serverUrl = this.configService.get<string>(
      'SERVER_URL',
      'http://localhost:3000',
    );
    // 默认 25MB
    this.maxFileSize = this.configService.get<number>(
      'STT_MAX_FILE_SIZE',
      25 * 1024 * 1024,
    );
  }

  /**
   * 检查服务是否已配置
   */
  isConfigured(): boolean {
    return this.sttClient.isConfigured();
  }

  /**
   * 提取基础 MIME 类型（去掉 codec 参数）
   */
  private parseBaseMimeType(mimeType: string): string {
    return mimeType.split(';')[0].trim();
  }

  /**
   * 规范化 MIME 类型（处理非标准格式）
   */
  private normalizeMimeType(mimeType: string): string {
    const baseMimeType = this.parseBaseMimeType(mimeType);
    return MIME_TYPE_NORMALIZATION[baseMimeType] || baseMimeType;
  }

  /**
   * 验证音频格式
   * 支持带 codec 参数的 MIME 类型（如 audio/webm;codecs=opus）
   */
  private validateMimeType(mimeType: string): void {
    const normalizedMimeType = this.normalizeMimeType(mimeType);
    if (!SUPPORTED_AUDIO_TYPES.includes(normalizedMimeType)) {
      throw new SpeechException(
        `Unsupported audio format: ${mimeType}. Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm`,
        SpeechErrorCode.UNSUPPORTED_FORMAT,
      );
    }
  }

  /**
   * 验证文件大小
   */
  private validateFileSize(fileSize: number): void {
    if (fileSize > this.maxFileSize) {
      throw new SpeechException(
        `File too large. Maximum size is ${Math.round(this.maxFileSize / 1024 / 1024)}MB`,
        SpeechErrorCode.FILE_TOO_LARGE,
      );
    }
  }

  /**
   * 转录音频文件
   * @param userId 用户 ID
   * @param audioBuffer 音频文件 Buffer
   * @param mimeType 音频 MIME 类型
   * @param saveRawAudio 是否保存原始音频到 R2
   */
  async transcribe(
    userId: string,
    audioBuffer: Buffer,
    mimeType: string,
    saveRawAudio: boolean = false,
  ): Promise<TranscribeResponseDto> {
    const startTime = Date.now();

    // 验证格式和大小
    this.validateMimeType(mimeType);
    this.validateFileSize(audioBuffer.length);

    // 规范化 MIME 类型（处理非标准格式如 audio/xm4a）
    const normalizedMimeType = this.normalizeMimeType(mimeType);

    this.logger.debug(
      `Starting transcription: ${audioBuffer.length} bytes, type: ${mimeType} -> ${normalizedMimeType}, save: ${saveRawAudio}`,
    );

    try {
      // 1. 调用 STT 转录
      const transcriptionResult = await this.sttClient.transcribe({
        audioBuffer,
        mimeType: normalizedMimeType,
      });

      // 2. 使用 LLM 优化文本
      const refinedText = await this.textRefiner.refine(
        transcriptionResult.text,
      );

      // 3. 根据 saveRawAudio 决定是否保存到 R2
      const audioFileId = randomUUID();
      let rawAudioUrl: string | null = null;

      if (saveRawAudio) {
        rawAudioUrl = await this.saveAudioToStorage(
          userId,
          audioFileId,
          audioBuffer,
          normalizedMimeType,
          transcriptionResult.text,
          refinedText,
        );
      }

      this.logger.debug('Transcription completed');

      // 记录活动日志
      await this.activityLogService.logSpeechTranscribe(
        userId,
        {
          fileSizeBytes: audioBuffer.length,
        },
        Date.now() - startTime,
      );

      return {
        id: audioFileId,
        text: refinedText,
        rawText: transcriptionResult.text,
        rawAudio: rawAudioUrl,
      };
    } catch (error) {
      if (error instanceof STTException) {
        throw new SpeechException(
          error.message,
          SpeechErrorCode.TRANSCRIPTION_FAILED,
          error,
        );
      }

      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new SpeechException(
        `Transcription failed: ${errorMsg}`,
        SpeechErrorCode.TRANSCRIPTION_FAILED,
        error,
      );
    }
  }

  /**
   * 获取音频文件（用于 rawAudio URL 访问）
   */
  async getAudioFile(
    audioFileId: string,
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const audioFile = await this.prisma.audioFile.findUnique({
      where: { id: audioFileId },
    });

    if (!audioFile) {
      return null;
    }

    try {
      const buffer = await this.r2Service.downloadFile(
        audioFile.userId,
        AUDIO_VAULT_ID,
        audioFileId,
      );
      return { buffer, mimeType: audioFile.mimeType };
    } catch (error) {
      // 记录错误但不抛出，保持 API 行为一致
      this.logger.warn(`Failed to download audio file: ${audioFileId}`, error);
      return null;
    }
  }

  /**
   * 保存音频到 R2 并创建数据库记录
   */
  private async saveAudioToStorage(
    userId: string,
    audioFileId: string,
    audioBuffer: Buffer,
    mimeType: string,
    rawText: string,
    refinedText: string,
  ): Promise<string> {
    const extension = this.getExtensionFromMimeType(mimeType);
    const fileName = `recording-${Date.now()}.${extension}`;
    const r2Key = `audio/${userId}/${audioFileId}.${extension}`;

    // 上传到 R2
    await this.r2Service.uploadFile(
      userId,
      AUDIO_VAULT_ID,
      audioFileId,
      audioBuffer,
      mimeType,
      { filename: fileName },
    );

    // 创建数据库记录
    await this.prisma.audioFile.create({
      data: {
        id: audioFileId,
        userId,
        vaultId: null,
        fileName,
        fileSize: audioBuffer.length,
        mimeType,
        r2Key,
        status: 'completed',
        rawText,
        text: refinedText,
      },
    });

    this.logger.debug(`Saved audio file: ${audioFileId}`);
    return `${this.serverUrl}/api/speech/audio/${audioFileId}`;
  }

  /**
   * 从 MIME 类型获取文件扩展名
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const baseMimeType = this.parseBaseMimeType(mimeType);
    const mimeToExt: Record<string, string> = {
      'audio/flac': 'flac',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/m4a': 'm4a',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
    };
    return mimeToExt[baseMimeType] || 'audio';
  }
}

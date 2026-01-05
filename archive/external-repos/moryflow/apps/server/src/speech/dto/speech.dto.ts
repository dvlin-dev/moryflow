/**
 * Speech DTOs
 * 语音转录相关的请求和响应类型
 *
 * [DEFINES]: Transcribe request/response schemas
 * [USED_BY]: SpeechController, SpeechService
 */

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ==================== Request Schemas ====================

/**
 * 转录请求（非文件字段）
 * 文件通过 multipart/form-data 的 'audio' 字段上传
 */
export const TranscribeSchema = z.object({
  /** 是否保存原始音频到 R2（字符串形式的 boolean） */
  rawAudio: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
});

export class TranscribeDto extends createZodDto(TranscribeSchema) {}

// ==================== Response Schemas ====================

/**
 * 转录响应
 */
export const TranscribeResponseSchema = z.object({
  id: z.string(),
  text: z.string(),
  rawText: z.string(),
  rawAudio: z.string().nullable(),
});

export type TranscribeResponseDto = z.infer<typeof TranscribeResponseSchema>;

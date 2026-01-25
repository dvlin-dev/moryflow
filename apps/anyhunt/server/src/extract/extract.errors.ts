/**
 * [DEFINES]: Extract 模块自定义错误类
 * [USED_BY]: extract.service.ts, extract.processor.ts
 * [POS]: 错误边界，提供清晰的错误类型和错误码
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/** Extract 错误码 */
export enum ExtractErrorCode {
  EXTRACT_JOB_NOT_FOUND = 'EXTRACT_JOB_NOT_FOUND',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  INVALID_SCHEMA = 'INVALID_SCHEMA',
  LLM_ERROR = 'LLM_ERROR',
  CONTENT_TOO_LARGE = 'CONTENT_TOO_LARGE',
  NO_CONTENT = 'NO_CONTENT',
}

/** Extract 错误基类 */
export abstract class ExtractError extends HttpException {
  constructor(
    public readonly code: ExtractErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}

/** 提取任务不存在错误 */
export class ExtractJobNotFoundError extends ExtractError {
  constructor(jobId: string) {
    super(
      ExtractErrorCode.EXTRACT_JOB_NOT_FOUND,
      `Extract job not found: ${jobId}`,
      HttpStatus.NOT_FOUND,
      { jobId },
    );
  }
}

/** 提取失败错误 */
export class ExtractionFailedError extends ExtractError {
  constructor(url: string, reason: string) {
    super(
      ExtractErrorCode.EXTRACTION_FAILED,
      `Extraction failed: ${reason}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { url, reason },
    );
  }
}

/** Schema 无效错误 */
export class InvalidSchemaError extends ExtractError {
  constructor(reason: string) {
    super(
      ExtractErrorCode.INVALID_SCHEMA,
      `Invalid extraction schema: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { reason },
    );
  }
}

/** LLM 错误 */
export class LlmError extends ExtractError {
  constructor(reason: string) {
    super(
      ExtractErrorCode.LLM_ERROR,
      `LLM processing error: ${reason}`,
      HttpStatus.BAD_GATEWAY,
      { reason },
    );
  }
}

/** 内容过大错误 */
export class ContentTooLargeError extends ExtractError {
  constructor(size: number, maxSize: number) {
    super(
      ExtractErrorCode.CONTENT_TOO_LARGE,
      `Content too large. Size: ${size}, Max: ${maxSize}`,
      HttpStatus.PAYLOAD_TOO_LARGE,
      { size, maxSize },
    );
  }
}

/** 无内容错误 */
export class NoContentError extends ExtractError {
  constructor(url: string) {
    super(
      ExtractErrorCode.NO_CONTENT,
      `No extractable content found`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { url },
    );
  }
}

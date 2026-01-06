/**
 * [DEFINES]: BatchScrape 模块自定义错误类
 * [USED_BY]: batch-scrape.service.ts, batch-scrape.processor.ts
 * [POS]: 错误边界，提供清晰的错误类型和错误码
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/** BatchScrape 错误码 */
export enum BatchScrapeErrorCode {
  BATCH_JOB_NOT_FOUND = 'BATCH_JOB_NOT_FOUND',
  BATCH_LIMIT_EXCEEDED = 'BATCH_LIMIT_EXCEEDED',
  BATCH_FAILED = 'BATCH_FAILED',
  INVALID_URLS = 'INVALID_URLS',
  EMPTY_URL_LIST = 'EMPTY_URL_LIST',
}

/** BatchScrape 错误基类 */
export abstract class BatchScrapeError extends HttpException {
  constructor(
    public readonly code: BatchScrapeErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super(
      {
        success: false,
        error: {
          code,
          message,
          details,
        },
      },
      status,
    );
  }
}

/** 批量任务不存在错误 */
export class BatchJobNotFoundError extends BatchScrapeError {
  constructor(jobId: string) {
    super(
      BatchScrapeErrorCode.BATCH_JOB_NOT_FOUND,
      `Batch scrape job not found: ${jobId}`,
      HttpStatus.NOT_FOUND,
      { jobId },
    );
  }
}

/** 批量限制超出错误 */
export class BatchLimitExceededError extends BatchScrapeError {
  constructor(limit: number, requested: number) {
    super(
      BatchScrapeErrorCode.BATCH_LIMIT_EXCEEDED,
      `Batch limit exceeded. Max: ${limit}, Requested: ${requested}`,
      HttpStatus.BAD_REQUEST,
      { limit, requested },
    );
  }
}

/** 批量处理失败错误 */
export class BatchFailedError extends BatchScrapeError {
  constructor(jobId: string, failedCount: number, totalCount: number) {
    super(
      BatchScrapeErrorCode.BATCH_FAILED,
      `Batch processing partially failed. ${failedCount}/${totalCount} URLs failed`,
      HttpStatus.PARTIAL_CONTENT,
      { jobId, failedCount, totalCount },
    );
  }
}

/** URL 列表无效错误 */
export class InvalidUrlsError extends BatchScrapeError {
  constructor(invalidUrls: string[]) {
    super(
      BatchScrapeErrorCode.INVALID_URLS,
      `${invalidUrls.length} invalid URLs in batch`,
      HttpStatus.BAD_REQUEST,
      { invalidUrls },
    );
  }
}

/** URL 列表为空错误 */
export class EmptyUrlListError extends BatchScrapeError {
  constructor() {
    super(
      BatchScrapeErrorCode.EMPTY_URL_LIST,
      'URL list cannot be empty',
      HttpStatus.BAD_REQUEST,
    );
  }
}

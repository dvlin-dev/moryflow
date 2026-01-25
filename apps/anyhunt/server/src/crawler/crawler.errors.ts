/**
 * [DEFINES]: Crawler 模块自定义错误类
 * [USED_BY]: crawler.service.ts, crawler.processor.ts
 * [POS]: 错误边界，提供清晰的错误类型和错误码
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/** Crawler 错误码 */
export enum CrawlerErrorCode {
  CRAWL_JOB_NOT_FOUND = 'CRAWL_JOB_NOT_FOUND',
  CRAWL_LIMIT_EXCEEDED = 'CRAWL_LIMIT_EXCEEDED',
  CRAWL_FAILED = 'CRAWL_FAILED',
  CRAWL_TIMEOUT = 'CRAWL_TIMEOUT',
  INVALID_START_URL = 'INVALID_START_URL',
  MAX_DEPTH_EXCEEDED = 'MAX_DEPTH_EXCEEDED',
}

/** Crawler 错误基类 */
export abstract class CrawlerError extends HttpException {
  constructor(
    public readonly code: CrawlerErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}

/** 爬取任务不存在错误 */
export class CrawlJobNotFoundError extends CrawlerError {
  constructor(jobId: string) {
    super(
      CrawlerErrorCode.CRAWL_JOB_NOT_FOUND,
      `Crawl job not found: ${jobId}`,
      HttpStatus.NOT_FOUND,
      { jobId },
    );
  }
}

/** 爬取限制超出错误 */
export class CrawlLimitExceededError extends CrawlerError {
  constructor(limit: number, current: number) {
    super(
      CrawlerErrorCode.CRAWL_LIMIT_EXCEEDED,
      `Crawl limit exceeded. Limit: ${limit}, Current: ${current}`,
      HttpStatus.BAD_REQUEST,
      { limit, current },
    );
  }
}

/** 爬取失败错误 */
export class CrawlFailedError extends CrawlerError {
  constructor(url: string, reason: string) {
    super(
      CrawlerErrorCode.CRAWL_FAILED,
      `Crawl failed: ${reason}`,
      HttpStatus.BAD_GATEWAY,
      { url, reason },
    );
  }
}

/** 爬取超时错误 */
export class CrawlTimeoutError extends CrawlerError {
  constructor(jobId: string, timeout: number) {
    super(
      CrawlerErrorCode.CRAWL_TIMEOUT,
      `Crawl job timed out after ${timeout}ms`,
      HttpStatus.GATEWAY_TIMEOUT,
      { jobId, timeout },
    );
  }
}

/** 起始 URL 无效错误 */
export class InvalidStartUrlError extends CrawlerError {
  constructor(url: string, reason: string) {
    super(
      CrawlerErrorCode.INVALID_START_URL,
      `Invalid start URL: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { url, reason },
    );
  }
}

/** 最大深度超出错误 */
export class MaxDepthExceededError extends CrawlerError {
  constructor(maxDepth: number) {
    super(
      CrawlerErrorCode.MAX_DEPTH_EXCEEDED,
      `Maximum crawl depth exceeded: ${maxDepth}`,
      HttpStatus.BAD_REQUEST,
      { maxDepth },
    );
  }
}

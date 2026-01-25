/**
 * [DEFINES]: Scraper 模块自定义错误类
 * [USED_BY]: scraper.service.ts, scraper.processor.ts
 * [POS]: 错误边界，提供清晰的错误类型和错误码
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/** Scraper 错误码 */
export enum ScraperErrorCode {
  URL_VALIDATION_FAILED = 'URL_VALIDATION_FAILED',
  SCRAPE_TIMEOUT = 'SCRAPE_TIMEOUT',
  SCRAPE_FAILED = 'SCRAPE_FAILED',
  BROWSER_ERROR = 'BROWSER_ERROR',
  NAVIGATION_ERROR = 'NAVIGATION_ERROR',
  CONTENT_EXTRACTION_FAILED = 'CONTENT_EXTRACTION_FAILED',
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  BLOCKED_URL = 'BLOCKED_URL',
}

/** Scraper 错误基类 */
export abstract class ScraperError extends HttpException {
  constructor(
    public readonly code: ScraperErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}

/** URL 验证失败错误 */
export class UrlValidationError extends ScraperError {
  constructor(url: string, reason: string) {
    super(
      ScraperErrorCode.URL_VALIDATION_FAILED,
      `URL validation failed: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { url, reason },
    );
  }
}

/** 抓取超时错误 */
export class ScrapeTimeoutError extends ScraperError {
  constructor(url: string, timeout: number) {
    super(
      ScraperErrorCode.SCRAPE_TIMEOUT,
      `Scrape timed out after ${timeout}ms`,
      HttpStatus.GATEWAY_TIMEOUT,
      { url, timeout },
    );
  }
}

/** 抓取失败错误 */
export class ScrapeFailedError extends ScraperError {
  constructor(url: string, reason: string) {
    super(
      ScraperErrorCode.SCRAPE_FAILED,
      `Failed to scrape URL: ${reason}`,
      HttpStatus.BAD_GATEWAY,
      { url, reason },
    );
  }
}

/** 浏览器错误 */
export class BrowserError extends ScraperError {
  constructor(reason: string) {
    super(
      ScraperErrorCode.BROWSER_ERROR,
      `Browser error: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { reason },
    );
  }
}

/** 导航错误 */
export class NavigationError extends ScraperError {
  constructor(url: string, statusCode?: number) {
    super(
      ScraperErrorCode.NAVIGATION_ERROR,
      statusCode
        ? `Navigation failed with status ${statusCode}`
        : 'Navigation failed',
      HttpStatus.BAD_GATEWAY,
      { url, statusCode },
    );
  }
}

/** 内容提取失败错误 */
export class ContentExtractionError extends ScraperError {
  constructor(url: string, reason: string) {
    super(
      ScraperErrorCode.CONTENT_EXTRACTION_FAILED,
      `Content extraction failed: ${reason}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { url, reason },
    );
  }
}

/** 任务不存在错误 */
export class JobNotFoundError extends ScraperError {
  constructor(jobId: string) {
    super(
      ScraperErrorCode.JOB_NOT_FOUND,
      `Job not found: ${jobId}`,
      HttpStatus.NOT_FOUND,
      { jobId },
    );
  }
}

/** URL 被阻止错误 */
export class BlockedUrlError extends ScraperError {
  constructor(url: string, reason: string) {
    super(
      ScraperErrorCode.BLOCKED_URL,
      `URL is blocked: ${reason}`,
      HttpStatus.FORBIDDEN,
      { url, reason },
    );
  }
}

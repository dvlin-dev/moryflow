// apps/server/src/common/constants/error-codes.ts

// Import and re-export Prisma-generated ScrapeErrorCode as single source of truth
import { ScrapeErrorCode as PrismaScrapeErrorCode } from '../../../generated/prisma/enums';

// Re-export for external use
export const ScrapeErrorCode = PrismaScrapeErrorCode;
export type ScrapeErrorCode = PrismaScrapeErrorCode;

// 错误码对应的 HTTP 状态码
export const ERROR_CODE_HTTP_STATUS: Record<ScrapeErrorCode, number> = {
  [ScrapeErrorCode.PAGE_TIMEOUT]: 504,
  [ScrapeErrorCode.URL_NOT_ALLOWED]: 403,
  [ScrapeErrorCode.SELECTOR_NOT_FOUND]: 400,
  [ScrapeErrorCode.BROWSER_ERROR]: 500,
  [ScrapeErrorCode.NETWORK_ERROR]: 502,
  [ScrapeErrorCode.RATE_LIMITED]: 429,
  [ScrapeErrorCode.QUOTA_EXCEEDED]: 402,
  [ScrapeErrorCode.INVALID_URL]: 400,
  [ScrapeErrorCode.PAGE_NOT_FOUND]: 404,
  [ScrapeErrorCode.ACCESS_DENIED]: 403,
  [ScrapeErrorCode.STORAGE_ERROR]: 500,
};

// 错误码对应的用户友好消息
export const ERROR_CODE_MESSAGES: Record<ScrapeErrorCode, string> = {
  [ScrapeErrorCode.PAGE_TIMEOUT]: 'Page load timed out',
  [ScrapeErrorCode.URL_NOT_ALLOWED]: 'URL is not allowed (SSRF protection)',
  [ScrapeErrorCode.SELECTOR_NOT_FOUND]: 'CSS selector not found on page',
  [ScrapeErrorCode.BROWSER_ERROR]: 'Browser encountered an error',
  [ScrapeErrorCode.NETWORK_ERROR]: 'Network error occurred',
  [ScrapeErrorCode.RATE_LIMITED]: 'Rate limit exceeded',
  [ScrapeErrorCode.QUOTA_EXCEEDED]: 'Quota exceeded',
  [ScrapeErrorCode.INVALID_URL]: 'Invalid URL format',
  [ScrapeErrorCode.PAGE_NOT_FOUND]: 'Page not found (404)',
  [ScrapeErrorCode.ACCESS_DENIED]: 'Access denied (403)',
  [ScrapeErrorCode.STORAGE_ERROR]: 'File storage error',
};

/**
 * oEmbed 常量定义
 */

/** 缓存 Key 前缀 */
export const OEMBED_CACHE_PREFIX = 'oembed:';

/** 请求超时时间（毫秒） */
export const OEMBED_REQUEST_TIMEOUT_MS = 10_000;

/** 各 Provider 缓存时间（秒） */
export const PROVIDER_CACHE_TTL: Record<string, number> = {
  twitter: 3_600, // 1 小时（推文可能被删除）
  youtube: 86_400, // 24 小时
  vimeo: 86_400, // 24 小时
  spotify: 86_400, // 24 小时
  soundcloud: 86_400, // 24 小时
};

/** Provider Endpoints */
export const PROVIDER_ENDPOINTS = {
  twitter: 'https://publish.twitter.com/oembed',
  youtube: 'https://www.youtube.com/oembed',
  vimeo: 'https://vimeo.com/api/oembed.json',
  spotify: 'https://open.spotify.com/oembed',
  soundcloud: 'https://soundcloud.com/oembed',
} as const;

/** 错误码 */
export enum OembedErrorCode {
  INVALID_URL = 'INVALID_URL',
  NOT_FOUND = 'NOT_FOUND',
  UNSUPPORTED_PROVIDER = 'UNSUPPORTED_PROVIDER',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  FORMAT_NOT_SUPPORTED = 'FORMAT_NOT_SUPPORTED',
  TIMEOUT = 'TIMEOUT',
}

/**
 * API Key 模块常量
 */

/** API Key 前缀 */
export const API_KEY_PREFIX = 'mm_';

/** API Key 随机字节长度（32 字节 = 64 hex 字符） */
export const API_KEY_LENGTH = 32;

/** Redis 缓存前缀 */
export const CACHE_PREFIX = 'apikey:';

/** 缓存 TTL（秒） */
export const CACHE_TTL_SECONDS = 60;

/** API Key 显示前缀长度（mm_ + 8 字符） */
export const KEY_PREFIX_DISPLAY_LENGTH = API_KEY_PREFIX.length + 8;

/** API Key select 字段（用于列表和详情查询） */
export const API_KEY_SELECT_FIELDS = {
  id: true,
  name: true,
  keyPrefix: true,
  isActive: true,
  lastUsedAt: true,
  expiresAt: true,
  createdAt: true,
} as const;

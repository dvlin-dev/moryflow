/**
 * 验证相关常量配置
 */

/** 用户名验证配置 */
export const USERNAME_CONFIG = {
  MIN_LENGTH: 6,
  MAX_LENGTH: 20,
  PATTERN: /^[a-zA-Z0-9_-]+$/,
} as const

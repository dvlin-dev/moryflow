/**
 * ActivityLog 常量定义
 */

/** 事件分类 */
export const ACTIVITY_CATEGORY = {
  AUTH: 'auth',
  AI: 'ai',
  VAULT: 'vault',
  STORAGE: 'storage',
  PAYMENT: 'payment',
  SYNC: 'sync',
  ADMIN: 'admin',
} as const;

export type ActivityCategory =
  (typeof ACTIVITY_CATEGORY)[keyof typeof ACTIVITY_CATEGORY];

/** 日志级别 */
export const ACTIVITY_LEVEL = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export type ActivityLevel =
  (typeof ACTIVITY_LEVEL)[keyof typeof ACTIVITY_LEVEL];

/** details 字段最大大小（字节） */
export const MAX_DETAILS_SIZE = 4096;

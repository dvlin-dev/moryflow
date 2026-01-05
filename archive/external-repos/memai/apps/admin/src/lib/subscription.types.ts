/**
 * 订阅相关共享类型定义
 * 单一数据源 - 与 Prisma Schema 保持一致
 */

/** 订阅层级 */
export type SubscriptionTier = 'FREE' | 'HOBBY' | 'ENTERPRISE';

/** 订阅状态 */
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'EXPIRED';

/** 订阅层级选项列表 */
export const SUBSCRIPTION_TIER_OPTIONS: readonly SubscriptionTier[] = [
  'FREE',
  'HOBBY',
  'ENTERPRISE',
] as const;

/** 订阅状态选项列表 */
export const SUBSCRIPTION_STATUS_OPTIONS: readonly SubscriptionStatus[] = [
  'ACTIVE',
  'CANCELED',
  'PAST_DUE',
  'EXPIRED',
] as const;

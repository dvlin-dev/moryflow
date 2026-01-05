/**
 * [DEFINES]: 订阅模块常量
 * [USED_BY]: subscription.service.ts, quota.constants.ts
 * [POS]: 订阅层级枚举、价格配置
 */

export enum SubscriptionTier {
  FREE = 'FREE',
  HOBBY = 'HOBBY',
  ENTERPRISE = 'ENTERPRISE',
}

// 订阅价格配置 (美元)
export const TIER_PRICING = {
  [SubscriptionTier.FREE]: 0,
  [SubscriptionTier.HOBBY]: 19, // $19/月
  [SubscriptionTier.ENTERPRISE]: null, // 按量计费，联系销售
} as const;

// 默认订阅层级
export const DEFAULT_TIER = SubscriptionTier.FREE;

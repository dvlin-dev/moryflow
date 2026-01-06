/**
 * [DEFINES]: 配额模块常量
 * [USED_BY]: quota.service.ts, quota.guard.ts
 * [POS]: 配额限制配置、功能权限配置
 *
 * 职责：只管理配额限制和功能权限
 */

import { SubscriptionTier } from '../subscription/subscription.constants';

// ============ 配额限制配置 ============

export interface TierLimits {
  /** Memory 存储上限 (-1 表示无限) */
  memories: number;
  /** 每月 API 调用次数 (-1 表示无限) */
  monthlyApiCalls: number;
  /** 每分钟请求限制 */
  rateLimitPerMinute: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    memories: 10000,
    monthlyApiCalls: 1000,
    rateLimitPerMinute: 30,
  },
  [SubscriptionTier.HOBBY]: {
    memories: 50000,
    monthlyApiCalls: 5000,
    rateLimitPerMinute: 60,
  },
  [SubscriptionTier.ENTERPRISE]: {
    memories: -1, // 无限制
    monthlyApiCalls: -1,
    rateLimitPerMinute: 300,
  },
};

// ============ 功能权限配置 ============

export interface TierFeatures {
  graphMemory: boolean;
  advancedAnalytics: boolean;
  auditLogs: boolean;
  techSupport: boolean;
  customFeatures: boolean;
}

export const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  [SubscriptionTier.FREE]: {
    graphMemory: true,
    advancedAnalytics: true,
    auditLogs: true,
    techSupport: false,
    customFeatures: false,
  },
  [SubscriptionTier.HOBBY]: {
    graphMemory: true,
    advancedAnalytics: true,
    auditLogs: true,
    techSupport: false,
    customFeatures: false,
  },
  [SubscriptionTier.ENTERPRISE]: {
    graphMemory: true,
    advancedAnalytics: true,
    auditLogs: true,
    techSupport: true,
    customFeatures: true,
  },
};

// ============ 工具函数 ============

export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_LIMITS[tier] ?? TIER_LIMITS[SubscriptionTier.FREE];
}

export function getTierFeatures(tier: SubscriptionTier): TierFeatures {
  return TIER_FEATURES[tier] ?? TIER_FEATURES[SubscriptionTier.FREE];
}

/**
 * Pricing Configuration
 * Aiget 套餐和配额定价配置
 */

import type { SubscriptionTier } from '../types';

// ==================== 套餐配置 ====================

/** 套餐优先级顺序 */
export const TIER_ORDER: SubscriptionTier[] = ['FREE', 'BASIC', 'PRO', 'TEAM'];

/** 每个套餐的月度配额 */
export const TIER_MONTHLY_QUOTA: Record<SubscriptionTier, number> = {
  FREE: 100,
  BASIC: 5000,
  PRO: 20000,
  TEAM: 60000,
};

/** 套餐限制配置 */
export interface TierLimits {
  maxWidth: number;
  maxHeight: number;
  maxDelay: number;
  ratePerMinute: number;
  maxConcurrent: number;
  retentionDays: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  FREE: {
    maxWidth: 1280,
    maxHeight: 800,
    maxDelay: 3000,
    ratePerMinute: 10,
    maxConcurrent: 2,
    retentionDays: 7,
  },
  BASIC: {
    maxWidth: 2560,
    maxHeight: 1440,
    maxDelay: 5000,
    ratePerMinute: 30,
    maxConcurrent: 5,
    retentionDays: 30,
  },
  PRO: {
    maxWidth: 3840,
    maxHeight: 2160,
    maxDelay: 10000,
    ratePerMinute: 60,
    maxConcurrent: 10,
    retentionDays: 90,
  },
  TEAM: {
    maxWidth: 3840,
    maxHeight: 2160,
    maxDelay: 10000,
    ratePerMinute: 120,
    maxConcurrent: 20,
    retentionDays: 365,
  },
};

/** 套餐功能开关 */
export interface TierFeatures {
  fullPage: boolean;
  clip: boolean;
  scripts: boolean;
  webhook: boolean;
  noWatermark: boolean;
}

export const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  FREE: {
    fullPage: true,
    clip: false,
    scripts: false,
    webhook: false,
    noWatermark: false,
  },
  BASIC: {
    fullPage: true,
    clip: true,
    scripts: false,
    webhook: false,
    noWatermark: true,
  },
  PRO: {
    fullPage: true,
    clip: true,
    scripts: true,
    webhook: true,
    noWatermark: true,
  },
  TEAM: {
    fullPage: true,
    clip: true,
    scripts: true,
    webhook: true,
    noWatermark: true,
  },
};

// ==================== 定价配置 ====================

/** 套餐价格（美分） */
export const TIER_PRICES: Record<SubscriptionTier, { monthly: number; yearly: number }> = {
  FREE: { monthly: 0, yearly: 0 },
  BASIC: { monthly: 900, yearly: 9000 },
  PRO: { monthly: 2900, yearly: 29000 },
  TEAM: { monthly: 7900, yearly: 79000 },
};

/** 按量购买阶梯定价（美分/次） */
export const QUOTA_PRICING = [
  { min: 1, max: 1000, pricePerUnit: 0.4 },
  { min: 1001, max: 10000, pricePerUnit: 0.3 },
  { min: 10001, max: 50000, pricePerUnit: 0.25 },
  { min: 50001, max: Infinity, pricePerUnit: 0.2 },
];

// ==================== 工具函数 ====================

/**
 * 获取套餐优先级
 */
export function getTierLevel(tier: SubscriptionTier): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * 比较两个套餐的优先级
 * @returns true 如果 userTier >= requiredTier
 */
export function hasTierAccess(
  userTier: SubscriptionTier,
  requiredTier: SubscriptionTier,
): boolean {
  return getTierLevel(userTier) >= getTierLevel(requiredTier);
}

/**
 * 计算按量购买价格
 */
export function calculateQuotaPrice(amount: number): number {
  let totalPrice = 0;
  let remaining = amount;

  for (const tier of QUOTA_PRICING) {
    if (remaining <= 0) break;

    const tierAmount = Math.min(remaining, tier.max - tier.min + 1);
    totalPrice += tierAmount * tier.pricePerUnit;
    remaining -= tierAmount;
  }

  return Math.ceil(totalPrice); // 向上取整到分
}

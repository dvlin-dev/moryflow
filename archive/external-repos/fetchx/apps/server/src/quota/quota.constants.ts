/**
 * [DEFINES]: 配额模块常量
 * [USED_BY]: quota.service.ts, quota.repository.ts
 * [POS]: 套餐配置、限制参数、阶梯定价
 */

import type { SubscriptionTier } from '../types/tier.types';

// ============ 套餐配额配置 ============

export interface TierQuotaConfig {
  /** 月度配额 */
  monthlyQuota: number;
  /** 最大分辨率宽度 */
  maxWidth: number;
  /** 最大分辨率高度 */
  maxHeight: number;
  /** 最大等待延迟 (ms) */
  maxDelay: number;
  /** 每分钟请求限制 */
  ratePerMinute: number;
  /** 最大并发数 */
  maxConcurrent: number;
  /** 文件保留天数 */
  retentionDays: number;
  /** 功能权限 */
  features: {
    fullPage: boolean;
    clip: boolean;
    scripts: boolean;
    webhook: boolean;
    noWatermark: boolean;
  };
}

/** 各套餐配额配置 */
export const TIER_QUOTA_CONFIGS: Record<SubscriptionTier, TierQuotaConfig> = {
  FREE: {
    monthlyQuota: 100,
    maxWidth: 1280,
    maxHeight: 800,
    maxDelay: 3000,
    ratePerMinute: 10,
    maxConcurrent: 2,
    retentionDays: 7,
    features: {
      fullPage: true,
      clip: false,
      scripts: false,
      webhook: false,
      noWatermark: false,
    },
  },
  BASIC: {
    monthlyQuota: 5000,
    maxWidth: 2560,
    maxHeight: 1440,
    maxDelay: 5000,
    ratePerMinute: 30,
    maxConcurrent: 5,
    retentionDays: 30,
    features: {
      fullPage: true,
      clip: true,
      scripts: false,
      webhook: false,
      noWatermark: true,
    },
  },
  PRO: {
    monthlyQuota: 20000,
    maxWidth: 3840,
    maxHeight: 2160,
    maxDelay: 10000,
    ratePerMinute: 60,
    maxConcurrent: 10,
    retentionDays: 90,
    features: {
      fullPage: true,
      clip: true,
      scripts: true,
      webhook: true,
      noWatermark: true,
    },
  },
  TEAM: {
    monthlyQuota: 60000,
    maxWidth: 3840,
    maxHeight: 2160,
    maxDelay: 10000,
    ratePerMinute: 120,
    maxConcurrent: 20,
    retentionDays: 365,
    features: {
      fullPage: true,
      clip: true,
      scripts: true,
      webhook: true,
      noWatermark: true,
    },
  },
};

// ============ 按量购买定价（阶梯） ============

export interface QuotaPriceTier {
  /** 最小数量（包含） */
  min: number;
  /** 最大数量（包含） */
  max: number;
  /** 单价（美分） */
  pricePerUnit: number;
}

/** 阶梯定价配置 */
export const QUOTA_PRICING_TIERS: QuotaPriceTier[] = [
  { min: 1, max: 1000, pricePerUnit: 0.4 }, // $0.004/次
  { min: 1001, max: 10000, pricePerUnit: 0.3 }, // $0.003/次
  { min: 10001, max: 50000, pricePerUnit: 0.25 }, // $0.0025/次
  { min: 50001, max: Infinity, pricePerUnit: 0.2 }, // $0.002/次
];

// ============ 周期配置 ============

/** 月度周期天数 */
export const PERIOD_DAYS = 30;

/** 周期毫秒数 */
export const PERIOD_MS = PERIOD_DAYS * 24 * 60 * 60 * 1000;

// ============ 默认值 ============

/** 默认套餐 */
export const DEFAULT_TIER: SubscriptionTier = 'FREE';

/** 默认月度配额 */
export const DEFAULT_MONTHLY_QUOTA = TIER_QUOTA_CONFIGS[DEFAULT_TIER].monthlyQuota;

// ============ 工具函数 ============

/**
 * 根据套餐获取月度配额上限
 */
export function getMonthlyQuotaByTier(tier: SubscriptionTier): number {
  return TIER_QUOTA_CONFIGS[tier]?.monthlyQuota ?? DEFAULT_MONTHLY_QUOTA;
}

/**
 * 根据套餐获取完整配置
 */
export function getTierConfig(tier: SubscriptionTier): TierQuotaConfig {
  return TIER_QUOTA_CONFIGS[tier] ?? TIER_QUOTA_CONFIGS[DEFAULT_TIER];
}

/**
 * 计算购买价格（阶梯定价）
 * @param amount 购买数量
 * @returns 总价（美分）
 */
export function calculateQuotaPrice(amount: number): number {
  let remaining = amount;
  let total = 0;
  let processed = 0;

  for (const tier of QUOTA_PRICING_TIERS) {
    if (remaining <= 0) break;

    const tierStart = Math.max(tier.min - 1, processed);
    const tierEnd = Math.min(tier.max, processed + remaining);
    const tierAmount = tierEnd - tierStart;

    if (tierAmount > 0) {
      total += tierAmount * tier.pricePerUnit;
      remaining -= tierAmount;
      processed += tierAmount;
    }
  }

  return Math.ceil(total); // 向上取整
}

/**
 * 计算新周期结束时间
 */
export function calculatePeriodEnd(from: Date = new Date()): Date {
  return new Date(from.getTime() + PERIOD_MS);
}

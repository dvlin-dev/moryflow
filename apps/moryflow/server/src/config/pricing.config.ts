/**
 * [PROVIDES]: 积分/订阅/产品配置与映射
 * [DEPENDS]: process.env
 * [POS]: 支付与配额策略的单一数据源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { SubscriptionTier } from '../types';

// ==================== Tier 相关配置 ====================

/** Tier 优先级顺序 */
export const TIER_ORDER: SubscriptionTier[] = [
  'free',
  'starter',
  'basic',
  'pro',
  'license',
];

/** 每个 Tier 的月度积分额度（按月费向上取整 × 1000 计算） */
export const TIER_CREDITS: Record<string, number> = {
  free: 0,
  starter: 5000, // ceil($4.99) × 1000
  basic: 10000, // ceil($9.90) × 1000
  pro: 20000, // ceil($19.90) × 1000
  license: 0, // License 用户使用购买的积分
};

// ==================== Creem 产品配置 ====================

/** 产品类型 */
export type ProductType = 'subscription' | 'credits' | 'license';

/** 产品配置（前端展示用） */
export interface ProductConfig {
  name: string;
  type: ProductType;
  priceUsd: number;
  credits?: number;
  billingCycle?: 'monthly' | 'yearly';
  licenseTier?: 'standard' | 'pro';
  activationLimit?: number;
}

/** 获取 Creem 产品 ID */
export function getCreemProducts() {
  return {
    // Starter 订阅
    STARTER_MONTHLY: process.env.CREEM_PRODUCT_STARTER_MONTHLY ?? '',
    STARTER_YEARLY: process.env.CREEM_PRODUCT_STARTER_YEARLY ?? '',
    // Basic 订阅
    BASIC_MONTHLY: process.env.CREEM_PRODUCT_BASIC_MONTHLY ?? '',
    BASIC_YEARLY: process.env.CREEM_PRODUCT_BASIC_YEARLY ?? '',
    // Pro 订阅
    PRO_MONTHLY: process.env.CREEM_PRODUCT_PRO_MONTHLY ?? '',
    PRO_YEARLY: process.env.CREEM_PRODUCT_PRO_YEARLY ?? '',
    // 积分包
    CREDITS_5000: process.env.CREEM_PRODUCT_CREDITS_5000 ?? '',
    CREDITS_10000: process.env.CREEM_PRODUCT_CREDITS_10000 ?? '',
    CREDITS_50000: process.env.CREEM_PRODUCT_CREDITS_50000 ?? '',
    // License
    LICENSE_STANDARD: process.env.CREEM_PRODUCT_LICENSE_STANDARD ?? '',
    LICENSE_PRO: process.env.CREEM_PRODUCT_LICENSE_PRO ?? '',
  };
}

/**
 * 获取所有产品配置（前端展示用）
 * 返回 Map<productId, ProductConfig>
 */
export function getProductConfigs(): Map<string, ProductConfig> {
  const products = getCreemProducts();
  const configs = new Map<string, ProductConfig>();

  // Starter 订阅
  if (products.STARTER_MONTHLY) {
    configs.set(products.STARTER_MONTHLY, {
      name: 'Starter Monthly',
      type: 'subscription',
      priceUsd: 4.99,
      credits: TIER_CREDITS.starter,
      billingCycle: 'monthly',
    });
  }
  if (products.STARTER_YEARLY) {
    configs.set(products.STARTER_YEARLY, {
      name: 'Starter Yearly',
      type: 'subscription',
      priceUsd: 49.9,
      credits: TIER_CREDITS.starter,
      billingCycle: 'yearly',
    });
  }

  // Basic 订阅
  if (products.BASIC_MONTHLY) {
    configs.set(products.BASIC_MONTHLY, {
      name: 'Basic Monthly',
      type: 'subscription',
      priceUsd: 9.9,
      credits: TIER_CREDITS.basic,
      billingCycle: 'monthly',
    });
  }
  if (products.BASIC_YEARLY) {
    configs.set(products.BASIC_YEARLY, {
      name: 'Basic Yearly',
      type: 'subscription',
      priceUsd: 99,
      credits: TIER_CREDITS.basic,
      billingCycle: 'yearly',
    });
  }

  // Pro 订阅
  if (products.PRO_MONTHLY) {
    configs.set(products.PRO_MONTHLY, {
      name: 'Pro Monthly',
      type: 'subscription',
      priceUsd: 19.9,
      credits: TIER_CREDITS.pro,
      billingCycle: 'monthly',
    });
  }
  if (products.PRO_YEARLY) {
    configs.set(products.PRO_YEARLY, {
      name: 'Pro Yearly',
      type: 'subscription',
      priceUsd: 199,
      credits: TIER_CREDITS.pro,
      billingCycle: 'yearly',
    });
  }

  // 积分包
  if (products.CREDITS_5000) {
    configs.set(products.CREDITS_5000, {
      name: 'Credits Pack (5000)',
      type: 'credits',
      priceUsd: 5,
      credits: 5000,
    });
  }
  if (products.CREDITS_10000) {
    configs.set(products.CREDITS_10000, {
      name: 'Credits Pack (10000)',
      type: 'credits',
      priceUsd: 10,
      credits: 10000,
    });
  }
  if (products.CREDITS_50000) {
    configs.set(products.CREDITS_50000, {
      name: 'Credits Pack (50000)',
      type: 'credits',
      priceUsd: 50,
      credits: 50000,
    });
  }

  // License 产品
  if (products.LICENSE_STANDARD) {
    configs.set(products.LICENSE_STANDARD, {
      name: 'License Standard',
      type: 'license',
      priceUsd: 49,
      licenseTier: 'standard',
      activationLimit: 2,
    });
  }
  if (products.LICENSE_PRO) {
    configs.set(products.LICENSE_PRO, {
      name: 'License Pro',
      type: 'license',
      priceUsd: 99,
      licenseTier: 'pro',
      activationLimit: 5,
    });
  }

  return configs;
}

/** 获取产品 ID 到 Tier 的映射 */
export function getProductTierMap(): Record<string, SubscriptionTier> {
  const products = getCreemProducts();
  const map: Record<string, SubscriptionTier> = {};

  if (products.STARTER_MONTHLY) map[products.STARTER_MONTHLY] = 'starter';
  if (products.STARTER_YEARLY) map[products.STARTER_YEARLY] = 'starter';
  if (products.BASIC_MONTHLY) map[products.BASIC_MONTHLY] = 'basic';
  if (products.BASIC_YEARLY) map[products.BASIC_YEARLY] = 'basic';
  if (products.PRO_MONTHLY) map[products.PRO_MONTHLY] = 'pro';
  if (products.PRO_YEARLY) map[products.PRO_YEARLY] = 'pro';

  return map;
}

// ==================== 积分配置 ====================

/** 每日免费积分额度 */
export const DAILY_FREE_CREDITS = 100;

/** 购买积分有效期（天） */
export const PURCHASED_CREDITS_EXPIRY_DAYS = 365;

/** 默认订阅周期（毫秒） - 30 天 */
export const DEFAULT_SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/** 获取积分包配置 - 产品 ID 到积分数量的映射 */
export function getCreditPacks(): Record<string, number> {
  const products = getCreemProducts();
  const packs: Record<string, number> = {};

  if (products.CREDITS_5000) packs[products.CREDITS_5000] = 5000;
  if (products.CREDITS_10000) packs[products.CREDITS_10000] = 10000;
  if (products.CREDITS_50000) packs[products.CREDITS_50000] = 50000;

  return packs;
}

// ==================== License 配置 ====================

/** 获取 License 产品配置 - 产品 ID 到配置的映射 */
export function getLicenseConfig(): Record<
  string,
  { tier: 'standard' | 'pro'; activationLimit: number }
> {
  const products = getCreemProducts();
  const config: Record<
    string,
    { tier: 'standard' | 'pro'; activationLimit: number }
  > = {};

  if (products.LICENSE_STANDARD) {
    config[products.LICENSE_STANDARD] = {
      tier: 'standard',
      activationLimit: 2,
    };
  }
  if (products.LICENSE_PRO) {
    config[products.LICENSE_PRO] = { tier: 'pro', activationLimit: 5 };
  }

  return config;
}

// ==================== 积分计算 ====================

/** 积分与美元的兑换比例：1000 积分 = $1（内部计算用，对用户隐藏） */
export const CREDITS_PER_DOLLAR = 1000;

/** 利润倍率（影响 AI 调用的积分消耗，对用户隐藏） */
export const PROFIT_MULTIPLIER = 2.0;

/**
 * 获取 Tier 优先级
 */
export function getTierLevel(tier: SubscriptionTier): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * 比较两个 Tier 的优先级
 * @returns true 如果 userTier >= requiredTier
 */
export function hasTierAccess(
  userTier: SubscriptionTier,
  requiredTier: SubscriptionTier,
): boolean {
  return getTierLevel(userTier) >= getTierLevel(requiredTier);
}

/**
 * 根据产品 ID 获取 Tier
 * 优先使用显式映射，fallback 到名称推断
 */
export function getTierFromProductId(productId: string): SubscriptionTier {
  const tierMap = getProductTierMap();
  if (tierMap[productId]) {
    return tierMap[productId];
  }

  // Fallback: 从产品 ID 名称推断（按优先级从低到高匹配，避免误匹配）
  const lowerProductId = productId.toLowerCase();
  if (lowerProductId.includes('starter')) return 'starter';
  if (lowerProductId.includes('basic')) return 'basic';
  if (lowerProductId.includes('pro')) return 'pro';
  return 'free';
}

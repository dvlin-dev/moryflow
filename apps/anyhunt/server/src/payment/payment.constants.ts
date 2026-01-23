/**
 * [PROVIDES]: 支付常量、套餐/商品配置、周期工具函数
 * [DEPENDS]: none
 * [POS]: Payment 模块配置中心（价格/商品/配额映射）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { SubscriptionTier } from '../../generated/prisma-main/client';

/** 套餐对应的月度配额 */
export const TIER_MONTHLY_QUOTA: Record<SubscriptionTier, number> = {
  FREE: 100,
  BASIC: 5000,
  PRO: 20000,
  TEAM: 60000,
};

export const CREEM_SUBSCRIPTION_PRODUCTS = {
  // 示例，实际值需要从 Creem 控制台获取
  prod_basic_monthly: { tier: SubscriptionTier.BASIC },
  prod_basic_yearly: { tier: SubscriptionTier.BASIC },
  prod_pro_monthly: { tier: SubscriptionTier.PRO },
  prod_pro_yearly: { tier: SubscriptionTier.PRO },
  prod_team_monthly: { tier: SubscriptionTier.TEAM },
  prod_team_yearly: { tier: SubscriptionTier.TEAM },
} as const satisfies Record<string, { tier: SubscriptionTier }>;

export const CREEM_QUOTA_PRODUCTS = {
  // 示例，实际值需要从 Creem 控制台获取
  prod_quota_1000: { amount: 1000, price: 9900, currency: 'USD' },
  prod_quota_5000: { amount: 5000, price: 39900, currency: 'USD' },
  prod_quota_10000: { amount: 10000, price: 69900, currency: 'USD' },
  prod_quota_50000: { amount: 50000, price: 299000, currency: 'USD' },
} as const satisfies Record<
  string,
  { amount: number; price: number; currency: string }
>;

export type CreemSubscriptionProduct =
  (typeof CREEM_SUBSCRIPTION_PRODUCTS)[keyof typeof CREEM_SUBSCRIPTION_PRODUCTS];
export type CreemQuotaProduct =
  (typeof CREEM_QUOTA_PRODUCTS)[keyof typeof CREEM_QUOTA_PRODUCTS];

export function getSubscriptionProduct(
  productId: string,
): CreemSubscriptionProduct | null {
  return (
    CREEM_SUBSCRIPTION_PRODUCTS[
      productId as keyof typeof CREEM_SUBSCRIPTION_PRODUCTS
    ] ?? null
  );
}

export function getQuotaProduct(productId: string): CreemQuotaProduct | null {
  return (
    CREEM_QUOTA_PRODUCTS[productId as keyof typeof CREEM_QUOTA_PRODUCTS] ?? null
  );
}

/**
 * 安全地计算一个月后的日期
 * 避免 setMonth 在月末日期时的溢出问题（如 1月31日 + 1个月 = 3月3日）
 */
export function addOneMonth(date: Date): Date {
  const result = new Date(date);
  const currentMonth = result.getMonth();
  result.setMonth(currentMonth + 1);

  // 如果月份增加超过1个月，说明发生了溢出，回退到上月最后一天
  if (result.getMonth() > (currentMonth + 1) % 12) {
    result.setDate(0); // 设置为上月最后一天
  }

  return result;
}

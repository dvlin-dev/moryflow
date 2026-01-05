/**
 * Payment 模块常量配置
 */

import type { SubscriptionTier } from '../../generated/prisma/client';

/** 套餐对应的月度配额 */
export const TIER_MONTHLY_QUOTA: Record<SubscriptionTier, number> = {
  FREE: 100,
  BASIC: 5000,
  PRO: 20000,
  TEAM: 60000,
};

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

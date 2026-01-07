/**
 * Payment 模块类型定义
 */

import type { SubscriptionTier } from '../../generated/prisma/client';

/** 订阅激活参数 */
export interface SubscriptionActivatedParams {
  userId: string;
  creemCustomerId: string;
  creemSubscriptionId: string;
  tier: SubscriptionTier;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

/** 配额购买参数 */
export interface QuotaPurchaseParams {
  userId: string;
  /** 购买的配额数量 */
  amount: number;
  creemOrderId: string;
  /** 金额（分） */
  price: number;
}

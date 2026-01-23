/**
 * [DEFINES]: 配额模块类型定义
 * [USED_BY]: quota.service.ts, quota.repository.ts, quota.controller.ts
 * [POS]: 配额模块核心类型，定义配额操作的输入输出结构
 */

import type { QuotaSource } from '../../generated/prisma-main/client';

// ============ 配额状态 ============

/** 配额状态查询结果 */
export interface QuotaStatus {
  /** 每日免费 Credits（UTC 天） */
  daily: {
    limit: number;
    used: number;
    remaining: number;
    resetsAt: Date;
  };
  /** 月度配额 */
  monthly: {
    limit: number;
    used: number;
    remaining: number;
  };
  /** 购买配额余额 */
  purchased: number;
  /** 总可用配额 */
  totalRemaining: number;
  /** 当前周期结束时间 */
  periodEndsAt: Date;
  /** 当前周期开始时间 */
  periodStartsAt: Date;
}

// ============ 配额操作 ============

/** 预扣配额结果 */
export interface DeductResult {
  success: true;
  /** 本次扣减的明细（可跨多个 bucket；用于失败退费） */
  breakdown: Array<{
    source: QuotaSource;
    amount: number;
    transactionId: string;
    balanceBefore: number;
    balanceAfter: number;
  }>;
}

/** 配额不足结果 */
export interface InsufficientQuotaResult {
  success: false;
  /** 当前可用配额 */
  available: number;
  /** 需要的配额 */
  required: number;
}

/** 预扣配额操作结果 */
export type DeductQuotaResult = DeductResult | InsufficientQuotaResult;

/** 返还配额参数 */
export interface RefundParams {
  userId: string;
  /** 关联的业务引用 ID（用于幂等性退款） */
  referenceId: string;
  /** 原始扣费交易 ID（daily credits 用于定位 UTC 天） */
  deductTransactionId?: string;
  /** 原扣减来源 */
  source: QuotaSource;
  /** 返还数量 */
  amount: number;
}

/** 返还配额结果 */
export interface RefundResult {
  success: boolean;
  /** 创建的交易记录 ID */
  transactionId?: string;
  /** 返还前余额 */
  balanceBefore?: number;
  /** 返还后余额 */
  balanceAfter?: number;
}

// ============ 配额初始化 ============

/** 初始化配额参数 */
export interface InitQuotaParams {
  userId: string;
  /** 月度配额上限（默认根据套餐） */
  monthlyLimit?: number;
}

// ============ 配额购买 ============

/** 增加购买配额参数 */
export interface AddPurchasedQuotaParams {
  userId: string;
  amount: number;
  /** 关联的订单 ID（幂等） */
  orderId: string;
}

// ============ 周期重置 ============

/** 周期重置结果 */
export interface PeriodResetResult {
  wasReset: boolean;
  previousUsed?: number;
  newPeriodEnd?: Date;
}

// ============ 类型守卫 ============

/** 判断是否为扣减成功结果 */
export function isDeductSuccess(
  result: DeductQuotaResult,
): result is DeductResult {
  return result.success === true;
}

/** 判断是否为配额不足结果 */
export function isInsufficientQuota(
  result: DeductQuotaResult,
): result is InsufficientQuotaResult {
  return result.success === false;
}

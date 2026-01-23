/**
 * [DEFINES]: 订阅/配额/回调相关类型
 * [USED_BY]: payment.service.ts, payment-webhook.controller.ts
 * [POS]: Payment 模块类型定义入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { SubscriptionTier } from '../../generated/prisma-main/client';

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
  /** 币种（如 USD） */
  currency: string;
}

/** Webhook 事件记录参数（去重） */
export interface WebhookEventRecordParams {
  eventId: string;
  eventType: string;
  userId?: string;
  creemObjectId?: string;
  creemOrderId?: string;
  eventCreatedAt?: Date | null;
}

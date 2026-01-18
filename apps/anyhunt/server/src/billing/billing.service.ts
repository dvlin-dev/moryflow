/**
 * [INPUT]: userId, billingKey, referenceId, 执行结果
 * [OUTPUT]: DeductResult | RefundResult
 * [POS]: 计费编排层（扣费/退费），基于 QuotaService 实现
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及 apps/anyhunt/server/CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { getBillingRule, type BillingKey } from './billing.rules';
import { QuotaService } from '../quota/quota.service';
import type { DeductResult, RefundResult } from '../quota/quota.types';
import { DuplicateRefundError } from '../quota/quota.errors';

export interface BillingDeductParams {
  userId: string;
  billingKey: BillingKey;
  referenceId: string;
  skipIfFromCache?: boolean;
  fromCache?: boolean;
}

export interface BillingRefundParams {
  userId: string;
  billingKey: BillingKey;
  referenceId: string;
  breakdown: DeductResult['breakdown'];
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly quotaService: QuotaService) {}

  /**
   * 对一次业务操作扣费：
   * - 支持命中缓存跳过扣费（skipIfFromCache）
   * - 统一使用稳定的 reason：`${billingKey}:${referenceId}`，保证退款幂等
   */
  async deductOrThrow(
    params: BillingDeductParams,
  ): Promise<{ deduct: DeductResult; amount: number } | null> {
    const { userId, billingKey, referenceId, fromCache } = params;
    const rule = getBillingRule(billingKey);

    const shouldSkip =
      (params.skipIfFromCache ?? rule.skipIfFromCache ?? false) &&
      fromCache === true;

    if (shouldSkip) {
      return null;
    }

    const cost = rule.cost;
    if (cost <= 0) {
      return null;
    }

    const deduct = await this.quotaService.deductOrThrow(
      userId,
      cost,
      `${billingKey}:${referenceId}`,
    );
    return { deduct, amount: cost };
  }

  /**
   * 失败退费（best-effort）：
   * - 幂等性：`${billingKey}:${referenceId}`
   */
  async refundOnFailure(params: BillingRefundParams): Promise<RefundResult> {
    const { userId, billingKey, referenceId, breakdown } = params;
    const rule = getBillingRule(billingKey);

    if (!rule.refundOnFailure || breakdown.length === 0) {
      return { success: true };
    }

    let allSuccess = true;
    for (const item of breakdown) {
      if (!item.amount || item.amount <= 0) continue;

      try {
        const result = await this.quotaService.refund({
          userId,
          referenceId: `refund:${item.transactionId}`,
          deductTransactionId: item.transactionId,
          source: item.source,
          amount: item.amount,
        });
        if (!result.success) {
          allSuccess = false;
        }
      } catch (error) {
        if (error instanceof DuplicateRefundError) {
          continue;
        }
        allSuccess = false;
        this.logger.warn(
          `退费失败: billingKey=${billingKey}, referenceId=${referenceId}, error=${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return { success: allSuccess };
  }
}

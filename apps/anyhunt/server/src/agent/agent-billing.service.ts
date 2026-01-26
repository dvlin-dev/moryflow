/**
 * Agent Billing Service
 *
 * [INPUT]: 计费参数、用户/任务信息
 * [OUTPUT]: Credits 扣费、退款、进度更新
 * [POS]: L3 Agent 计费逻辑（分段检查点、失败退款、取消结算），从 AgentService 拆分
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  StreamedRunResult,
  Usage,
  AgentOutputType,
} from '@openai/agents-core';
import { QuotaService } from '../quota/quota.service';
import {
  DuplicateRefundError,
  QuotaExceededError,
} from '../quota/quota.errors';
import { AgentTaskRepository } from './agent-task.repository';
import type { CreateAgentTaskInput, AgentTaskProgress } from './dto';
import type { BrowserAgentContext } from './tools';

export const BILLING_CONSTANTS = {
  CREDITS_PER_1K_TOKENS: 1,
  CREDITS_PER_TOOL_CALL: 0.1,
  CREDITS_PER_MINUTE: 0.5,
  BASE_CREDITS: 1,
  CREDIT_CHECK_INTERVAL: 100,
} as const;

export interface BillingParams {
  maxCredits?: number;
  currentCredits: number;
  toolCallCount: number;
  startTime: Date;
  chargedCredits: number;
}

export class CreditsExceededError extends Error {
  constructor(
    public readonly used: number,
    public readonly max: number,
  ) {
    super(`Credits exceeded: used ${used}, max ${max}`);
    this.name = 'CreditsExceededError';
  }
}

type BrowserAgent = import('@openai/agents-core').Agent<
  BrowserAgentContext,
  AgentOutputType
>;
type AgentStreamedResult = StreamedRunResult<BrowserAgentContext, BrowserAgent>;

@Injectable()
export class AgentBillingService {
  private readonly logger = new Logger(AgentBillingService.name);

  constructor(
    private readonly quotaService: QuotaService,
    private readonly taskRepository: AgentTaskRepository,
  ) {}

  createBillingParams(startTime: Date, maxCredits?: number): BillingParams {
    return {
      maxCredits,
      currentCredits: BILLING_CONSTANTS.BASE_CREDITS,
      toolCallCount: 0,
      startTime,
      chargedCredits: 0,
    };
  }

  buildProgress(billing: BillingParams): AgentTaskProgress {
    return {
      creditsUsed: billing.currentCredits,
      toolCallCount: billing.toolCallCount,
      elapsedMs: Date.now() - billing.startTime.getTime(),
    };
  }

  updateBillingFromUsage(billing: BillingParams, usage?: Usage): void {
    billing.currentCredits = this.calculateCreditsFromUsage(usage, billing);
  }

  calculateCreditsFromUsage(
    usage: Usage | undefined,
    billing?: BillingParams,
  ): number {
    let credits = BILLING_CONSTANTS.BASE_CREDITS;

    if (usage) {
      const totalTokens = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
      credits +=
        Math.ceil(totalTokens / 1000) * BILLING_CONSTANTS.CREDITS_PER_1K_TOKENS;
    }

    if (billing?.toolCallCount) {
      credits +=
        billing.toolCallCount * BILLING_CONSTANTS.CREDITS_PER_TOOL_CALL;
    }

    if (billing?.startTime) {
      const durationMinutes =
        (Date.now() - billing.startTime.getTime()) / 60000;
      credits +=
        Math.ceil(durationMinutes) * BILLING_CONSTANTS.CREDITS_PER_MINUTE;
    }

    return Math.ceil(credits);
  }

  calculateCreditsFromStream(
    result: AgentStreamedResult,
    billing?: BillingParams,
  ): number {
    const usage = result.state?._context?.usage;
    return this.calculateCreditsFromUsage(usage, billing);
  }

  checkCreditsLimit(billing: BillingParams): void {
    if (billing.maxCredits && billing.currentCredits > billing.maxCredits) {
      throw new CreditsExceededError(
        billing.currentCredits,
        billing.maxCredits,
      );
    }
  }

  async ensureMinimumQuota(userId: string, taskId: string): Promise<void> {
    const status = await this.quotaService.getStatus(userId);
    if (status.totalRemaining < BILLING_CONSTANTS.BASE_CREDITS) {
      this.logger.warn(
        `Agent task ${taskId} blocked: insufficient credits (remaining ${status.totalRemaining})`,
      );
      throw new QuotaExceededError(
        status.totalRemaining,
        BILLING_CONSTANTS.BASE_CREDITS,
      );
    }
  }

  async applyQuotaCheckpoint(
    userId: string,
    taskId: string,
    billing: BillingParams,
  ): Promise<void> {
    while (
      billing.currentCredits - billing.chargedCredits >=
      BILLING_CONSTANTS.CREDIT_CHECK_INTERVAL
    ) {
      const nextCheckpoint =
        billing.chargedCredits + BILLING_CONSTANTS.CREDIT_CHECK_INTERVAL;
      const deductReason = `fetchx.agent:${taskId}:checkpoint:${nextCheckpoint}`;
      const deduct = await this.quotaService.deductOrThrow(
        userId,
        BILLING_CONSTANTS.CREDIT_CHECK_INTERVAL,
        deductReason,
      );

      const createdCharges = [];
      try {
        for (const item of deduct.breakdown) {
          const referenceId = `refund:${item.transactionId}`;
          const charge = await this.taskRepository.createCharge({
            taskId,
            userId,
            amount: item.amount,
            source: item.source,
            transactionId: item.transactionId,
            referenceId,
          });
          createdCharges.push(charge);
        }
      } catch (error) {
        this.logger.error(
          `Failed to record agent checkpoint charge for task ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
        );

        for (const item of deduct.breakdown) {
          try {
            await this.quotaService.refund({
              userId,
              referenceId: `refund:${item.transactionId}`,
              deductTransactionId: item.transactionId,
              source: item.source,
              amount: item.amount,
            });
          } catch (refundError) {
            if (!(refundError instanceof DuplicateRefundError)) {
              this.logger.warn(
                `Failed to refund agent checkpoint breakdown for task ${taskId}: ${refundError instanceof Error ? refundError.message : String(refundError)}`,
              );
            }
          }
        }

        for (const charge of createdCharges) {
          try {
            await this.taskRepository.markChargeRefunded(charge.id);
          } catch (markError) {
            this.logger.warn(
              `Failed to mark refunded checkpoint charge ${charge.id}: ${markError instanceof Error ? markError.message : String(markError)}`,
            );
          }
        }

        throw error;
      }

      billing.chargedCredits = nextCheckpoint;
    }
  }

  async settleCharges(
    userId: string,
    taskId: string,
    billing: BillingParams,
    creditsUsed: number,
  ): Promise<void> {
    const remaining = Math.max(0, creditsUsed - billing.chargedCredits);
    if (remaining <= 0) {
      return;
    }

    const deductReason = `fetchx.agent:${taskId}:final`;
    const deduct = await this.quotaService.deductOrThrow(
      userId,
      remaining,
      deductReason,
    );

    const createdCharges = [];
    try {
      for (const item of deduct.breakdown) {
        const referenceId = `refund:${item.transactionId}`;
        const charge = await this.taskRepository.createCharge({
          taskId,
          userId,
          amount: item.amount,
          source: item.source,
          transactionId: item.transactionId,
          referenceId,
        });
        createdCharges.push(charge);
      }
    } catch (error) {
      this.logger.error(
        `Failed to record agent final charge for task ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
      );

      for (const item of deduct.breakdown) {
        try {
          await this.quotaService.refund({
            userId,
            referenceId: `refund:${item.transactionId}`,
            deductTransactionId: item.transactionId,
            source: item.source,
            amount: item.amount,
          });
        } catch (refundError) {
          if (!(refundError instanceof DuplicateRefundError)) {
            this.logger.warn(
              `Failed to refund agent final breakdown for task ${taskId}: ${refundError instanceof Error ? refundError.message : String(refundError)}`,
            );
          }
        }
      }

      for (const charge of createdCharges) {
        try {
          await this.taskRepository.markChargeRefunded(charge.id);
        } catch (markError) {
          this.logger.warn(
            `Failed to mark refunded final charge ${charge.id}: ${markError instanceof Error ? markError.message : String(markError)}`,
          );
        }
      }

      throw error;
    }

    billing.chargedCredits += remaining;
  }

  async refundChargesOnFailure(userId: string, taskId: string): Promise<void> {
    const charges = await this.taskRepository.listCharges(taskId);
    for (const charge of charges) {
      if (charge.refundedAt) {
        continue;
      }

      try {
        const result = await this.quotaService.refund({
          userId,
          referenceId: charge.referenceId,
          deductTransactionId: charge.transactionId,
          source: charge.source,
          amount: charge.amount,
        });
        if (result.success) {
          await this.taskRepository.markChargeRefunded(charge.id);
        }
      } catch (error) {
        if (error instanceof DuplicateRefundError) {
          try {
            await this.taskRepository.markChargeRefunded(charge.id);
          } catch (markError) {
            this.logger.warn(
              `Failed to mark duplicate-refunded charge ${charge.id}: ${markError instanceof Error ? markError.message : String(markError)}`,
            );
          }
          continue;
        }
        this.logger.warn(
          `Failed to refund agent charge ${charge.id} for task ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  estimateCost(input: CreateAgentTaskInput): {
    estimatedCredits: number;
    breakdown: {
      base: number;
      tokenEstimate: number;
      toolCallEstimate: number;
      durationEstimate: number;
    };
  } {
    const messageChars = input.messages?.length
      ? input.messages.reduce(
          (total, message) => total + message.content.length,
          0,
        )
      : (input.prompt?.length ?? 0);
    const promptTokens = Math.ceil(messageChars / 4);
    const estimatedTotalTokens = promptTokens * 10;

    const urlCount = input.urls?.length ?? 1;
    const estimatedToolCalls = urlCount * 5 + 5;

    const estimatedDuration = Math.ceil(estimatedToolCalls * 0.5);

    const breakdown = {
      base: BILLING_CONSTANTS.BASE_CREDITS,
      tokenEstimate:
        Math.ceil(estimatedTotalTokens / 1000) *
        BILLING_CONSTANTS.CREDITS_PER_1K_TOKENS,
      toolCallEstimate:
        estimatedToolCalls * BILLING_CONSTANTS.CREDITS_PER_TOOL_CALL,
      durationEstimate:
        estimatedDuration * BILLING_CONSTANTS.CREDITS_PER_MINUTE,
    };

    return {
      estimatedCredits: Math.ceil(
        breakdown.base +
          breakdown.tokenEstimate +
          breakdown.toolCallEstimate +
          breakdown.durationEstimate,
      ),
      breakdown,
    };
  }
}

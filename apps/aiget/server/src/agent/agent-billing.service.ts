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
import type { StreamedRunResult, Usage, AgentOutputType } from '@aiget/agents-core';
import { QuotaService } from '../quota/quota.service';
import { DuplicateRefundError, QuotaExceededError } from '../quota/quota.errors';
import { AgentTaskRepository } from './agent-task.repository';
import type { CreateAgentTaskInput, AgentTaskProgress } from './dto';
import type { BrowserAgentContext } from './tools';

/** 计费常量 */
export const BILLING_CONSTANTS = {
  /** 每 1000 tokens 消耗的 credits */
  CREDITS_PER_1K_TOKENS: 1,
  /** 每个工具调用消耗的额外 credits */
  CREDITS_PER_TOOL_CALL: 0.1,
  /** 每分钟会话时长消耗的 credits */
  CREDITS_PER_MINUTE: 0.5,
  /** 基础 credits（任务启动费） */
  BASE_CREDITS: 1,
  /** 每次检查/扣减的 credits 阈值 */
  CREDIT_CHECK_INTERVAL: 100,
} as const;

/** 计费参数 */
export interface BillingParams {
  /** 最大允许消耗的 credits */
  maxCredits?: number;
  /** 当前已消耗的 credits */
  currentCredits: number;
  /** 工具调用次数 */
  toolCallCount: number;
  /** 会话开始时间 */
  startTime: Date;
  /** 已扣减的 credits（按 100 递增） */
  chargedCredits: number;
}

/** Credits 超限错误 */
export class CreditsExceededError extends Error {
  constructor(
    public readonly used: number,
    public readonly max: number
  ) {
    super(`Credits exceeded: used ${used}, max ${max}`);
    this.name = 'CreditsExceededError';
  }
}

type BrowserAgent = import('@aiget/agents-core').Agent<BrowserAgentContext, AgentOutputType>;
type AgentStreamedResult = StreamedRunResult<BrowserAgentContext, BrowserAgent>;

@Injectable()
export class AgentBillingService {
  private readonly logger = new Logger(AgentBillingService.name);

  constructor(
    private readonly quotaService: QuotaService,
    private readonly taskRepository: AgentTaskRepository
  ) {}

  /**
   * 初始化计费参数
   */
  createBillingParams(startTime: Date, maxCredits?: number): BillingParams {
    return {
      maxCredits,
      currentCredits: BILLING_CONSTANTS.BASE_CREDITS,
      toolCallCount: 0,
      startTime,
      chargedCredits: 0,
    };
  }

  /**
   * 构建任务进度
   */
  buildProgress(billing: BillingParams): AgentTaskProgress {
    return {
      creditsUsed: billing.currentCredits,
      toolCallCount: billing.toolCallCount,
      elapsedMs: Date.now() - billing.startTime.getTime(),
    };
  }

  /**
   * 更新计费进度（基于当前 usage + 工具调用 + 时长）
   */
  updateBillingFromUsage(billing: BillingParams, usage?: Usage): void {
    billing.currentCredits = this.calculateCreditsFromUsage(usage, billing);
  }

  /**
   * 基于 usage 计算 credits
   */
  calculateCreditsFromUsage(usage: Usage | undefined, billing?: BillingParams): number {
    let credits = BILLING_CONSTANTS.BASE_CREDITS;

    // Token 费用
    if (usage) {
      const totalTokens = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
      credits += Math.ceil(totalTokens / 1000) * BILLING_CONSTANTS.CREDITS_PER_1K_TOKENS;
    }

    // 工具调用费用
    if (billing?.toolCallCount) {
      credits += billing.toolCallCount * BILLING_CONSTANTS.CREDITS_PER_TOOL_CALL;
    }

    // 时长费用
    if (billing?.startTime) {
      const durationMinutes = (Date.now() - billing.startTime.getTime()) / 60000;
      credits += Math.ceil(durationMinutes) * BILLING_CONSTANTS.CREDITS_PER_MINUTE;
    }

    return Math.ceil(credits);
  }

  /**
   * 从流式结果计算 credits
   */
  calculateCreditsFromStream(result: AgentStreamedResult, billing?: BillingParams): number {
    const usage = result.state?._context?.usage;
    return this.calculateCreditsFromUsage(usage, billing);
  }

  /**
   * 检查是否超过 maxCredits 限制
   */
  checkCreditsLimit(billing: BillingParams): void {
    if (billing.maxCredits && billing.currentCredits > billing.maxCredits) {
      throw new CreditsExceededError(billing.currentCredits, billing.maxCredits);
    }
  }

  /**
   * 确保用户至少有基础 credits
   */
  async ensureMinimumQuota(userId: string, taskId: string): Promise<void> {
    const status = await this.quotaService.getStatus(userId);
    if (status.totalRemaining < BILLING_CONSTANTS.BASE_CREDITS) {
      this.logger.warn(
        `Agent task ${taskId} blocked: insufficient credits (remaining ${status.totalRemaining})`
      );
      throw new QuotaExceededError(status.totalRemaining, BILLING_CONSTANTS.BASE_CREDITS);
    }
  }

  /**
   * 按 100 credits 阶段性扣减/检查
   */
  async applyQuotaCheckpoint(
    userId: string,
    taskId: string,
    billing: BillingParams
  ): Promise<void> {
    while (
      billing.currentCredits - billing.chargedCredits >=
      BILLING_CONSTANTS.CREDIT_CHECK_INTERVAL
    ) {
      const nextCheckpoint = billing.chargedCredits + BILLING_CONSTANTS.CREDIT_CHECK_INTERVAL;
      const referenceId = `fetchx.agent:${taskId}:checkpoint:${nextCheckpoint}`;
      const deduct = await this.quotaService.deductOrThrow(
        userId,
        BILLING_CONSTANTS.CREDIT_CHECK_INTERVAL,
        referenceId
      );
      try {
        await this.taskRepository.createCharge({
          taskId,
          userId,
          amount: BILLING_CONSTANTS.CREDIT_CHECK_INTERVAL,
          source: deduct.source,
          transactionId: deduct.transactionId,
          referenceId,
        });
      } catch (error) {
        this.logger.error(
          `Failed to record agent checkpoint charge for task ${taskId}: ${error instanceof Error ? error.message : String(error)}`
        );
        try {
          await this.quotaService.refund({
            userId,
            referenceId,
            source: deduct.source,
            amount: BILLING_CONSTANTS.CREDIT_CHECK_INTERVAL,
          });
        } catch (refundError) {
          if (!(refundError instanceof DuplicateRefundError)) {
            this.logger.warn(
              `Failed to refund agent checkpoint charge for task ${taskId}: ${refundError instanceof Error ? refundError.message : String(refundError)}`
            );
          }
        }
        throw error;
      }
      billing.chargedCredits = nextCheckpoint;
    }
  }

  /**
   * 结算剩余 credits
   */
  async settleCharges(
    userId: string,
    taskId: string,
    billing: BillingParams,
    creditsUsed: number
  ): Promise<void> {
    const remaining = Math.max(0, creditsUsed - billing.chargedCredits);
    if (remaining <= 0) {
      return;
    }

    const referenceId = `fetchx.agent:${taskId}:final`;
    const deduct = await this.quotaService.deductOrThrow(userId, remaining, referenceId);
    try {
      await this.taskRepository.createCharge({
        taskId,
        userId,
        amount: remaining,
        source: deduct.source,
        transactionId: deduct.transactionId,
        referenceId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to record agent final charge for task ${taskId}: ${error instanceof Error ? error.message : String(error)}`
      );
      try {
        await this.quotaService.refund({
          userId,
          referenceId,
          source: deduct.source,
          amount: remaining,
        });
      } catch (refundError) {
        if (!(refundError instanceof DuplicateRefundError)) {
          this.logger.warn(
            `Failed to refund agent final charge for task ${taskId}: ${refundError instanceof Error ? refundError.message : String(refundError)}`
          );
        }
      }
      throw error;
    }
    billing.chargedCredits += remaining;
  }

  /**
   * 失败退费（best-effort）
   */
  async refundChargesOnFailure(userId: string, taskId: string): Promise<void> {
    const charges = await this.taskRepository.listCharges(taskId);
    for (const charge of charges) {
      if (charge.refundedAt) {
        continue;
      }

      try {
        await this.quotaService.refund({
          userId,
          referenceId: charge.referenceId,
          source: charge.source,
          amount: charge.amount,
        });
        await this.taskRepository.markChargeRefunded(charge.id);
      } catch (error) {
        if (error instanceof DuplicateRefundError) {
          continue;
        }
        this.logger.warn(
          `Failed to refund agent charge ${charge.id} for task ${taskId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * 估算任务成本（基于历史数据）
   */
  estimateCost(input: CreateAgentTaskInput): {
    estimatedCredits: number;
    breakdown: {
      base: number;
      tokenEstimate: number;
      toolCallEstimate: number;
      durationEstimate: number;
    };
  } {
    // 基于 prompt 长度估算 token 消耗
    const promptTokens = Math.ceil(input.prompt.length / 4);
    const estimatedTotalTokens = promptTokens * 10; // 假设 10x 扩展

    // 基于 URL 数量估算工具调用
    const urlCount = input.urls?.length ?? 1;
    const estimatedToolCalls = urlCount * 5 + 5; // 每个 URL 约 5 次操作

    // 估算时长（分钟）
    const estimatedDuration = Math.ceil(estimatedToolCalls * 0.5);

    const breakdown = {
      base: BILLING_CONSTANTS.BASE_CREDITS,
      tokenEstimate:
        Math.ceil(estimatedTotalTokens / 1000) * BILLING_CONSTANTS.CREDITS_PER_1K_TOKENS,
      toolCallEstimate: estimatedToolCalls * BILLING_CONSTANTS.CREDITS_PER_TOOL_CALL,
      durationEstimate: estimatedDuration * BILLING_CONSTANTS.CREDITS_PER_MINUTE,
    };

    return {
      estimatedCredits: Math.ceil(
        breakdown.base +
          breakdown.tokenEstimate +
          breakdown.toolCallEstimate +
          breakdown.durationEstimate
      ),
      breakdown,
    };
  }
}

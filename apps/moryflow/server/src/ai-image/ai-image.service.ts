/**
 * [INPUT]: (ImageGenerationRequest, userId, userTier) - 图片生成请求与用户信息
 * [OUTPUT]: (ImageGenerationResponse) - 统一格式的图片生成响应
 * [POS]: 图片生成核心服务，模型验证、权限检查、积分扣除/欠费记录、计费日志、Provider 路由
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreditService } from '../credit/credit.service';
import { CreditLedgerService } from '../credit-ledger';
import { ActivityLogService } from '../activity-log';
import { TIER_ORDER, CREDITS_PER_DOLLAR, PROFIT_MULTIPLIER } from '../config';

// DTO
import type {
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageUsage,
  SubscriptionTier,
} from './dto';

// 配置
import {
  getImageModelConfig,
  DEFAULT_IMAGE_MODEL,
  type ImageModelConfig,
} from './config';

// 模块
import { ImageProviderFactory } from './providers';
import {
  ModelNotFoundException,
  InsufficientModelPermissionException,
  InsufficientCreditsException,
  OutstandingDebtException,
  ImageGenerationException,
} from './exceptions';

@Injectable()
export class AiImageService {
  private readonly logger = new Logger(AiImageService.name);

  constructor(
    private readonly creditService: CreditService,
    private readonly creditLedgerService: CreditLedgerService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ==================== 公共 API ====================

  /**
   * 生成图片
   */
  async generateImage(
    userId: string,
    userTier: SubscriptionTier,
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResponse> {
    const startTime = Date.now();

    // 1. 获取并验证模型（使用硬编码配置）
    const modelConfig = this.getAndValidateModel(userTier, request.model);
    const modelId = modelConfig.modelId;

    this.logger.debug(
      `Image generation request: model=${modelId}, userId=${userId}`,
    );

    // 2. 预检积分余额
    await this.checkCreditsBalance(userId);

    // 3. 创建 Provider 实例
    const provider = ImageProviderFactory.createFromConfig(modelConfig);

    // 4. 调用 Provider 生成图片
    try {
      const result = await provider.generate({
        model: modelConfig.upstreamId,
        prompt: request.prompt,
        n: request.n,
        size: request.size,
        quality: request.quality,
        ...this.extractProviderSpecificOptions(request, provider.type),
      });

      // 5. 计算并扣除积分
      const usage: ImageUsage = {
        imageCount: result.usage?.imageCount ?? result.images.length,
        imageTokens: result.usage?.imageTokens,
      };
      const settlement = await this.settleImageUsage(
        userId,
        usage,
        modelConfig,
      );

      // 6. 记录活动日志
      const duration = Date.now() - startTime;
      await this.activityLogService.logImageGeneration(userId, {
        model: modelId,
        imageCount: usage.imageCount,
        creditsConsumed: this.calculateCredits(usage, modelConfig),
        ledgerEntryId: settlement?.id,
        ledgerStatus: settlement?.status ?? 'FAILED',
        anomalyCode: settlement?.anomalyCode ?? 'SETTLEMENT_FAILED',
        ledgerSummary: `AI image via ${modelId}`,
        duration,
      });

      this.logger.debug(
        `Image generation done: model=${modelId}, images=${usage.imageCount}, credits=${this.calculateCredits(usage, modelConfig)}, duration=${duration}ms`,
      );

      // 7. 构建响应
      return {
        created: Math.floor(Date.now() / 1000),
        data: result.images,
      };
    } catch (error) {
      // 包装 Provider 错误
      const message =
        error instanceof Error ? error.message : 'Image generation failed';
      this.logger.error(`Image generation error: ${message}`, error);
      throw new ImageGenerationException(message);
    }
  }

  // ==================== 内部方法 ====================

  /**
   * 获取并验证模型配置（使用硬编码配置）
   */
  private getAndValidateModel(
    userTier: SubscriptionTier,
    modelId?: string,
  ): ImageModelConfig {
    const actualModelId = modelId || DEFAULT_IMAGE_MODEL;
    const model = getImageModelConfig(actualModelId);

    if (!model || !model.enabled) {
      throw new ModelNotFoundException(actualModelId);
    }

    // 检查用户权限
    const userLevel = TIER_ORDER.indexOf(userTier);
    const modelLevel = TIER_ORDER.indexOf(model.minTier);

    if (userLevel < modelLevel) {
      throw new InsufficientModelPermissionException(userTier, actualModelId);
    }

    return model;
  }

  /**
   * 预检积分余额
   */
  private async checkCreditsBalance(userId: string): Promise<void> {
    const balance = await this.creditService.getCreditsBalance(userId);
    if (balance.debt > 0) {
      throw new OutstandingDebtException(balance.debt);
    }
    if (balance.total <= 0) {
      throw new InsufficientCreditsException(balance.total);
    }
  }

  /**
   * 计算积分消耗
   * 图片生成按张计费
   */
  private calculateCredits(usage: ImageUsage, model: ImageModelConfig): number {
    const totalCost = usage.imageCount * model.imagePrice;
    return Math.ceil(totalCost * CREDITS_PER_DOLLAR * PROFIT_MULTIPLIER);
  }

  private async settleImageUsage(
    userId: string,
    usage: ImageUsage,
    model: ImageModelConfig,
  ) {
    const computedCredits = this.calculateCredits(usage, model);
    const totalTokens = usage.imageTokens ?? 0;
    const idempotencyKey = `image:${userId}:${model.modelId}:${randomUUID()}`;
    const detailsJson = {
      imageCount: usage.imageCount,
      imageTokens: usage.imageTokens ?? null,
      requestModel: model.modelId,
    } as const;

    try {
      return await this.creditLedgerService.recordAiImageSettlement({
        userId,
        summary: `AI image via ${model.modelId}`,
        idempotencyKey,
        modelId: model.modelId,
        providerId: model.sdkType,
        totalTokens,
        inputPriceSnapshot: model.imagePrice,
        outputPriceSnapshot: 0,
        creditsPerDollarSnapshot: CREDITS_PER_DOLLAR,
        profitMultiplierSnapshot: PROFIT_MULTIPLIER,
        costUsd: usage.imageCount * model.imagePrice,
        computedCredits,
        detailsJson,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'AI image settlement failed';
      this.logger.error(
        `AI image settlement failed: userId=${userId}, model=${model.modelId}, error=${errorMessage}`,
      );

      try {
        return await this.creditLedgerService.recordAiSettlementFailure({
          userId,
          eventType: 'AI_IMAGE',
          summary: `AI image via ${model.modelId}`,
          idempotencyKey: `${idempotencyKey}:failed`,
          computedCredits,
          modelId: model.modelId,
          providerId: model.sdkType,
          totalTokens,
          inputPriceSnapshot: model.imagePrice,
          outputPriceSnapshot: 0,
          creditsPerDollarSnapshot: CREDITS_PER_DOLLAR,
          profitMultiplierSnapshot: PROFIT_MULTIPLIER,
          costUsd: usage.imageCount * model.imagePrice,
          detailsJson,
          errorMessage,
        });
      } catch (failureError) {
        this.logger.error(
          `Failed to persist AI image settlement failure: userId=${userId}, model=${model.modelId}`,
          failureError instanceof Error ? failureError.stack : undefined,
        );
        return null;
      }
    }
  }

  /**
   * 提取 Provider 特定参数
   */
  private extractProviderSpecificOptions(
    request: ImageGenerationRequest,
    providerType: string,
  ): Record<string, unknown> {
    switch (providerType) {
      case 'fal':
        return {
          seed: request.seed,
          enable_safety_checker: request.enable_safety_checker,
          // gpt-image-1.5 特有参数
          background: request.background,
          output_format: request.output_format,
        };
      default:
        return {};
    }
  }
}

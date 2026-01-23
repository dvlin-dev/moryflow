/**
 * [INPUT]: (ImageGenerationRequest, userId, userTier) - 图片生成请求与用户信息
 * [OUTPUT]: (ImageGenerationResponse) - 统一格式的图片生成响应
 * [POS]: 图片生成核心服务，模型验证、权限检查、积分扣除/欠费记录、计费日志、Provider 路由
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { CreditService } from '../credit/credit.service';
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
      const credits = await this.consumeCredits(userId, usage, modelConfig);

      // 6. 记录活动日志
      const duration = Date.now() - startTime;
      await this.activityLogService.logImageGeneration(userId, {
        model: modelId,
        imageCount: usage.imageCount,
        creditsConsumed: credits,
        duration,
      });

      this.logger.debug(
        `Image generation done: model=${modelId}, images=${usage.imageCount}, credits=${credits}, duration=${duration}ms`,
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
   * 扣除积分（含欠费时返回完整消耗）
   */
  private async consumeCredits(
    userId: string,
    usage: ImageUsage,
    model: ImageModelConfig,
  ): Promise<number> {
    const credits = this.calculateCredits(usage, model);
    const settlement = await this.creditService.consumeCreditsWithDebt(
      userId,
      credits,
    );

    if (settlement.debtIncurred > 0) {
      this.logger.warn(
        `Credits debt incurred: userId=${userId}, debt=${settlement.debtIncurred}`,
      );
    }

    return settlement.consumed + settlement.debtIncurred;
  }

  /**
   * 计算积分消耗
   * 图片生成按张计费
   */
  private calculateCredits(usage: ImageUsage, model: ImageModelConfig): number {
    const totalCost = usage.imageCount * model.imagePrice;
    return Math.ceil(totalCost * CREDITS_PER_DOLLAR * PROFIT_MULTIPLIER);
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

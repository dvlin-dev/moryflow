/**
 * [POS]: 配额检查 Guard
 *
 * 职责：在请求级别检查配额并记录用量
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { QuotaService } from './quota.service';
import { UsageService, UsageType } from '../usage/usage.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class QuotaGuard implements CanActivate {
  private readonly logger = new Logger(QuotaGuard.name);

  constructor(
    private readonly quotaService: QuotaService,
    private readonly usageService: UsageService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKeyId = request.apiKeyId;

    if (!apiKeyId) {
      this.logger.warn('QuotaGuard: apiKeyId not found in request');
      return true; // 如果没有 apiKeyId，跳过配额检查
    }

    // 1. 检查 API 配额
    const apiCheck = await this.quotaService.checkApiQuota(apiKeyId);
    if (!apiCheck.allowed) {
      throw new ForbiddenException(apiCheck.reason);
    }

    // 2. 根据订阅类型处理
    const isEnterprise = await this.subscriptionService.isEnterpriseByApiKey(apiKeyId);

    if (isEnterprise) {
      // Enterprise: 记录用量用于计费
      await this.usageService.recordUsageByApiKey(apiKeyId, UsageType.API_CALL);
    } else {
      // FREE/HOBBY: 增加配额使用计数
      await this.quotaService.incrementApiUsageByApiKey(apiKeyId);
    }

    return true;
  }
}

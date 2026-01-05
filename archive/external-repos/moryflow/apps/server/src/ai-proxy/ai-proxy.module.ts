/**
 * AI Proxy Module
 * 提供 OpenAI 兼容的 AI 代理功能
 *
 * 认证由全局 AuthGuard 处理（支持 Cookie 和 Bearer Token）
 */

import { Module } from '@nestjs/common';
import { AiProxyController } from './ai-proxy.controller';
import { AiProxyService } from './ai-proxy.service';
import { PrismaModule } from '../prisma';
import { CreditModule } from '../credit';

@Module({
  imports: [PrismaModule, CreditModule],
  controllers: [AiProxyController],
  providers: [AiProxyService],
  exports: [AiProxyService],
})
export class AiProxyModule {}

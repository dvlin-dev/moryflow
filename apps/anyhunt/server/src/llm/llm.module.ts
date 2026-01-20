/**
 * LLM Module
 *
 * Admin 动态配置 LLM Providers/Models，并在运行时为 Agent 路由模型。
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { LlmAdminController } from './llm-admin.controller';
import { LlmAdminService } from './llm-admin.service';
import { LlmOpenAiClientService } from './llm-openai-client.service';
import { LlmRoutingService } from './llm-routing.service';
import { LlmSecretService } from './llm-secret.service';
import { LlmUpstreamResolverService } from './llm-upstream-resolver.service';

@Module({
  imports: [PrismaModule],
  controllers: [LlmAdminController],
  providers: [
    LlmSecretService,
    LlmUpstreamResolverService,
    LlmAdminService,
    LlmRoutingService,
    LlmOpenAiClientService,
  ],
  exports: [LlmRoutingService, LlmOpenAiClientService],
})
export class LlmModule {}

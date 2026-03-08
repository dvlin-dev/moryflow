/**
 * LLM Module
 *
 * Admin 动态配置 LLM Providers/Models，并在运行时为 Agent 路由模型。
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { LlmAdminController } from './llm-admin.controller';
import { LlmAdminService } from './llm-admin.service';
import { LlmLanguageModelService } from './llm-language-model.service';
import { LlmRoutingService } from './llm-routing.service';
import { LlmSecretService } from './llm-secret.service';
import { LlmUpstreamResolverService } from './llm-upstream-resolver.service';

@Module({
  imports: [PrismaModule],
  controllers: [LlmAdminController],
  providers: [
    LlmSecretService,
    LlmUpstreamResolverService,
    LlmLanguageModelService,
    LlmAdminService,
    LlmRoutingService,
  ],
  exports: [LlmRoutingService, LlmLanguageModelService],
})
export class LlmModule {}

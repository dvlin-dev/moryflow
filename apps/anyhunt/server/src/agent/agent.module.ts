/**
 * Agent 模块
 *
 * 提供 L3 Agent API 功能：
 * - Agent 任务创建和执行
 * - Browser Tools 集成
 * - SSE 流式输出
 *
 * 依赖：Public L3 API 使用 ApiKeyGuard，因此必须导入 ApiKeyModule（提供 ApiKeyService）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Module } from '@nestjs/common';
import { QuotaModule } from '../quota/quota.module';
import { ApiKeyModule } from '../api-key';
import { LlmModule } from '../llm';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentModelService } from './agent-model.service';
import { AgentBillingService } from './agent-billing.service';
import { AgentStreamProcessor } from './agent-stream.processor';
import { AgentTaskRepository } from './agent-task.repository';
import { AgentTaskProgressStore } from './agent-task.progress.store';

@Module({
  imports: [QuotaModule, ApiKeyModule, LlmModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    AgentModelService,
    AgentBillingService,
    AgentStreamProcessor,
    AgentTaskRepository,
    AgentTaskProgressStore,
  ],
  exports: [AgentService],
})
export class AgentModule {}

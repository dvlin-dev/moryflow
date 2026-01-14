/**
 * Agent 模块
 *
 * 提供 L3 Agent API 功能：
 * - Agent 任务创建和执行
 * - Browser Tools 集成
 * - SSE 流式输出
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Module } from '@nestjs/common';
import { QuotaModule } from '../quota/quota.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentTaskRepository } from './agent-task.repository';
import { AgentTaskProgressStore } from './agent-task.progress.store';

@Module({
  imports: [QuotaModule],
  controllers: [AgentController],
  providers: [AgentService, AgentTaskRepository, AgentTaskProgressStore],
  exports: [AgentService],
})
export class AgentModule {}

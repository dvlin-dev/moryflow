/**
 * Agent 模块
 *
 * 提供 L3 Agent API 功能：
 * - Agent 任务创建和执行
 * - Browser Tools 集成
 * - SSE 流式输出
 */

import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

@Module({
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}

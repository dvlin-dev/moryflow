/**
 * Agent Service
 *
 * [INPUT]: Agent 任务请求
 * [OUTPUT]: 任务结果、SSE 事件流
 * [POS]: L3 Agent 核心业务逻辑，整合 @aiget/agents-core 与 Browser 模块
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  Agent,
  run,
  RunResult,
  StreamedRunResult,
  RunStreamEvent,
} from '@aiget/agents-core';
import { z } from 'zod';
import { SessionManager } from '../browser/session';
import { SnapshotService } from '../browser/snapshot';
import { ActionHandler } from '../browser/handlers';
import { UrlValidator } from '../common';
import { browserTools, BrowserToolContext } from './tools';
import type {
  CreateAgentTaskInput,
  AgentTaskResult,
  AgentStreamEvent,
} from './dto';

/** Agent 系统指令 */
const SYSTEM_INSTRUCTIONS = `你是 Fetchx Browser Agent，一个专业的网页数据收集助手。

你的任务是根据用户的 prompt，通过浏览器操作找到并提取所需数据。

工作流程：
1. 分析用户需求，确定需要收集的数据
2. 如果没有提供 URL，使用 web_search 搜索相关网站
3. 使用 browser_open 打开目标页面
4. 使用 browser_snapshot 获取页面结构
5. 根据快照中的 ref，使用 click/fill 等操作导航
6. 多次迭代直到找到所有需要的数据
7. 返回结构化的结果

注意事项：
- 每次操作后都应获取新的 snapshot 以了解页面变化
- 使用 @ref 格式（如 @e1）进行元素定位，比 CSS 选择器更可靠
- 如果页面需要登录，提示用户无法访问
- 遇到验证码或反爬机制时，返回错误信息
- 控制操作次数，避免无限循环`;

/** 任务存储 */
interface StoredTask {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  expiresAt: Date;
  result?: unknown;
  creditsUsed?: number;
  error?: string;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  /** 任务存储 */
  private readonly tasks = new Map<string, StoredTask>();

  /** 任务结果过期时间（10 分钟） */
  private readonly TASK_EXPIRY = 10 * 60 * 1000;

  constructor(
    private readonly sessionManager: SessionManager,
    private readonly snapshotService: SnapshotService,
    private readonly actionHandler: ActionHandler,
    private readonly urlValidator: UrlValidator,
  ) {
    // 定期清理过期任务
    setInterval(() => this.cleanupExpiredTasks(), 60 * 1000);
  }

  /**
   * 执行 Agent 任务（非流式）
   */
  async executeTask(input: CreateAgentTaskInput): Promise<AgentTaskResult> {
    const taskId = this.generateTaskId();
    const now = new Date();

    // 创建任务记录
    const task: StoredTask = {
      id: taskId,
      status: 'processing',
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.TASK_EXPIRY),
    };
    this.tasks.set(taskId, task);

    // 创建浏览器会话
    const session = await this.sessionManager.createSession();

    try {
      // 构建 Agent
      const agent = new Agent({
        name: 'Fetchx Browser Agent',
        model: 'gpt-4o',
        instructions: SYSTEM_INSTRUCTIONS,
        tools: browserTools,
        outputType: input.schema
          ? z.object(input.schema as z.ZodRawShape)
          : undefined,
        modelSettings: {
          temperature: 0.7,
          maxTokens: 4096,
        },
      });

      // 构建上下文
      const context: BrowserToolContext = {
        session,
        snapshotService: this.snapshotService,
        actionHandler: this.actionHandler,
        urlValidator: this.urlValidator,
      };

      // 构建用户 prompt
      let userPrompt = input.prompt;
      if (input.urls?.length) {
        userPrompt += `\n\n起始 URL：${input.urls.join(', ')}`;
      }

      // 执行 Agent
      const result = await run(agent, userPrompt, {
        context,
        maxTurns: 20,
      });

      // 计算 credits（简化版本：基于 token 数）
      const creditsUsed = this.calculateCredits(result);

      // 更新任务状态
      task.status = 'completed';
      task.result = result.finalOutput;
      task.creditsUsed = creditsUsed;

      return {
        id: taskId,
        status: 'completed',
        data: result.finalOutput,
        creditsUsed,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Agent task ${taskId} failed: ${errorMessage}`);

      task.status = 'failed';
      task.error = errorMessage;

      return {
        id: taskId,
        status: 'failed',
        error: errorMessage,
      };
    } finally {
      // 清理会话
      await this.sessionManager.closeSession(session.id);
    }
  }

  /**
   * 执行 Agent 任务（流式）
   * 返回异步生成器，用于 SSE 推送
   */
  async *executeTaskStream(
    input: CreateAgentTaskInput,
  ): AsyncGenerator<AgentStreamEvent, void, unknown> {
    const taskId = this.generateTaskId();
    const now = new Date();

    // 创建任务记录
    const task: StoredTask = {
      id: taskId,
      status: 'processing',
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.TASK_EXPIRY),
    };
    this.tasks.set(taskId, task);

    // 发送开始事件
    yield {
      type: 'started',
      id: taskId,
      expiresAt: task.expiresAt.toISOString(),
    };

    // 创建浏览器会话
    const session = await this.sessionManager.createSession();

    try {
      // 构建 Agent
      const agent = new Agent({
        name: 'Fetchx Browser Agent',
        model: 'gpt-4o',
        instructions: SYSTEM_INSTRUCTIONS,
        tools: browserTools,
        outputType: input.schema
          ? z.object(input.schema as z.ZodRawShape)
          : undefined,
        modelSettings: {
          temperature: 0.7,
          maxTokens: 4096,
        },
      });

      // 构建上下文
      const context: BrowserToolContext = {
        session,
        snapshotService: this.snapshotService,
        actionHandler: this.actionHandler,
        urlValidator: this.urlValidator,
      };

      // 构建用户 prompt
      let userPrompt = input.prompt;
      if (input.urls?.length) {
        userPrompt += `\n\n起始 URL：${input.urls.join(', ')}`;
      }

      yield { type: 'thinking', content: '正在分析任务需求...' };

      // 使用流式 API 执行 Agent
      const streamResult = (await run(agent, userPrompt, {
        context,
        maxTurns: 20,
        stream: true,
      })) as StreamedRunResult<BrowserToolContext, typeof agent>;

      // 处理流式事件
      for await (const event of streamResult) {
        const sseEvent = this.convertRunEventToSSE(event);
        if (sseEvent) {
          yield sseEvent;
        }
      }

      // 等待完成并获取最终结果
      const finalOutput = streamResult.finalOutput;
      const creditsUsed = this.calculateCreditsFromStream(streamResult);

      // 更新任务状态
      task.status = 'completed';
      task.result = finalOutput;
      task.creditsUsed = creditsUsed;

      // 发送完成事件
      yield {
        type: 'complete',
        data: finalOutput,
        creditsUsed,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Agent task ${taskId} failed: ${errorMessage}`);

      task.status = 'failed';
      task.error = errorMessage;

      yield {
        type: 'failed',
        error: errorMessage,
      };
    } finally {
      // 清理会话
      await this.sessionManager.closeSession(session.id);
    }
  }

  /**
   * 将 SDK 流事件转换为 SSE 事件
   */
  private convertRunEventToSSE(event: RunStreamEvent): AgentStreamEvent | null {
    switch (event.type) {
      case 'raw_model_stream_event': {
        // 处理模型流事件（思考过程）
        const modelEvent = event.data;
        if (
          modelEvent.type === 'content_block_delta' &&
          'delta' in modelEvent
        ) {
          const delta = modelEvent.delta as { text?: string };
          if (delta.text) {
            return { type: 'thinking', content: delta.text };
          }
        }
        break;
      }

      case 'run_item_stream_event': {
        // 处理运行项事件（工具调用）
        const item = event.item;
        if (item.type === 'tool_call_item') {
          const rawItem = item.rawItem as {
            call_id?: string;
            name?: string;
            arguments?: Record<string, unknown>;
          };
          return {
            type: 'tool_call',
            callId: rawItem.call_id ?? '',
            tool: rawItem.name ?? '',
            args: rawItem.arguments ?? {},
          };
        } else if (item.type === 'tool_call_output_item') {
          const rawItem = item.rawItem as {
            call_id?: string;
            name?: string;
            output?: unknown;
          };
          return {
            type: 'tool_result',
            callId: rawItem.call_id ?? '',
            tool: rawItem.name ?? '',
            result: rawItem.output,
          };
        }
        break;
      }

      case 'agent_updated_stream_event':
        // Agent 切换事件（如果有 handoff）
        return {
          type: 'progress',
          message: `切换到: ${event.agent.name}`,
          step: 0,
        };
    }

    return null;
  }

  /**
   * 从流式结果计算 credits
   */
  private calculateCreditsFromStream(
    result: StreamedRunResult<unknown, unknown>,
  ): number {
    const usage = result.state?._context?.usage;
    if (usage) {
      const totalTokens = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
      return Math.ceil(totalTokens / 1000);
    }
    return 1;
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): AgentTaskResult | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    return {
      id: task.id,
      status: task.status,
      data: task.result,
      creditsUsed: task.creditsUsed,
      error: task.error,
    };
  }

  /**
   * 计算 credits 消耗
   */
  private calculateCredits(result: RunResult<unknown, unknown>): number {
    // 简化计算：每 1000 tokens = 1 credit
    // 实际应根据模型定价计算
    const usage = result.state?._context?.usage;
    if (usage) {
      const totalTokens = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
      return Math.ceil(totalTokens / 1000);
    }
    return 1; // 默认消耗
  }

  /**
   * 生成任务 ID
   */
  private generateTaskId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `at_${timestamp}_${random}`;
  }

  /**
   * 清理过期任务
   */
  private cleanupExpiredTasks(): void {
    const now = new Date();
    const expiredIds: string[] = [];

    for (const [id, task] of this.tasks) {
      if (now > task.expiresAt) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      this.tasks.delete(id);
    }

    if (expiredIds.length > 0) {
      this.logger.debug(
        `Cleaned up ${expiredIds.length} expired agent task(s)`,
      );
    }
  }
}

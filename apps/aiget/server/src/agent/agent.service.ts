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
  type RunStreamEvent,
} from '@aiget/agents-core';

// 使用 any 类型别名避免 agents-core 复杂泛型导致 TypeScript OOM
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRunResult = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyStreamedRunResult = any;
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
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  expiresAt: Date;
  result?: unknown;
  creditsUsed?: number;
  error?: string;
  /** 用于取消任务的 AbortController */
  abortController?: AbortController;
  /** 关联的浏览器会话 ID */
  sessionId?: string;
}

/** 计费参数（P1 计费模型优化） */
interface BillingParams {
  /** 最大允许消耗的 credits */
  maxCredits?: number;
  /** 当前已消耗的 credits */
  currentCredits: number;
  /** 工具调用次数 */
  toolCallCount: number;
  /** 会话开始时间 */
  startTime: Date;
}

/** Credits 超限错误 */
export class CreditsExceededError extends Error {
  constructor(
    public readonly used: number,
    public readonly max: number,
  ) {
    super(`Credits exceeded: used ${used}, max ${max}`);
    this.name = 'CreditsExceededError';
  }
}

/** 计费常量 */
const BILLING_CONSTANTS = {
  /** 每 1000 tokens 消耗的 credits */
  CREDITS_PER_1K_TOKENS: 1,
  /** 每个工具调用消耗的额外 credits */
  CREDITS_PER_TOOL_CALL: 0.1,
  /** 每分钟会话时长消耗的 credits */
  CREDITS_PER_MINUTE: 0.5,
  /** 基础 credits（任务启动费） */
  BASE_CREDITS: 1,
  /** 默认 maxCredits 上限（防止无限循环） */
  DEFAULT_MAX_CREDITS: 100,
} as const;

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
    const abortController = new AbortController();

    // 创建任务记录
    const task: StoredTask = {
      id: taskId,
      status: 'processing',
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.TASK_EXPIRY),
      abortController,
    };
    this.tasks.set(taskId, task);

    // 初始化计费参数（P1 计费模型优化）
    const billing: BillingParams = {
      maxCredits: input.maxCredits ?? BILLING_CONSTANTS.DEFAULT_MAX_CREDITS,
      currentCredits: BILLING_CONSTANTS.BASE_CREDITS,
      toolCallCount: 0,
      startTime: now,
    };

    // 创建浏览器会话
    const session = await this.sessionManager.createSession();
    task.sessionId = session.id;

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
      } as any);

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
      const result = (await run(agent as any, userPrompt, {
        context: context as any,
        maxTurns: 20,
      } as any)) as AnyRunResult;

      // 从结果中提取工具调用次数
      const toolCallCount =
        result.state?.allItems?.filter(
          (item: unknown) =>
            (item as { type?: unknown } | null)?.type === 'tool_call_item',
        ).length ?? 0;
      billing.toolCallCount = toolCallCount;

      // 计算 credits（P1 计费模型优化）
      const creditsUsed = this.calculateCredits(result, billing);

      // 检查是否超过限制
      if (input.maxCredits && creditsUsed > input.maxCredits) {
        throw new CreditsExceededError(creditsUsed, input.maxCredits);
      }

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

      // 如果是超限错误，返回已消耗的 credits
      if (error instanceof CreditsExceededError) {
        task.creditsUsed = error.used;
        return {
          id: taskId,
          status: 'failed',
          error: errorMessage,
          creditsUsed: error.used,
        };
      }

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
    const abortController = new AbortController();

    // 创建任务记录
    const task: StoredTask = {
      id: taskId,
      status: 'processing',
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.TASK_EXPIRY),
      abortController,
    };
    this.tasks.set(taskId, task);

    // 初始化计费参数（P1 计费模型优化）
    const billing: BillingParams = {
      maxCredits: input.maxCredits ?? BILLING_CONSTANTS.DEFAULT_MAX_CREDITS,
      currentCredits: BILLING_CONSTANTS.BASE_CREDITS,
      toolCallCount: 0,
      startTime: now,
    };

    // 发送开始事件
    yield {
      type: 'started',
      id: taskId,
      expiresAt: task.expiresAt.toISOString(),
    };

    // 创建浏览器会话
    const session = await this.sessionManager.createSession();
    task.sessionId = session.id;

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
      } as any);

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
      const streamResult = (await run(agent as any, userPrompt, {
        context: context as any,
        maxTurns: 20,
        stream: true,
      } as any)) as AnyStreamedRunResult;

      // 处理流式事件并追踪计费
      for await (const event of streamResult) {
        // 检查是否被取消
        if (task.status === 'cancelled' || abortController.signal.aborted) {
          yield {
            type: 'failed',
            error: 'Task cancelled by user',
            creditsUsed: billing.currentCredits,
          };
          return;
        }

        // 追踪工具调用次数
        if (event.type === 'run_item_stream_event') {
          const item = event.item;
          if (item.type === 'tool_call_item') {
            billing.toolCallCount++;
            billing.currentCredits =
              BILLING_CONSTANTS.BASE_CREDITS +
              billing.toolCallCount * BILLING_CONSTANTS.CREDITS_PER_TOOL_CALL;

            // 检查 credits 限制
            try {
              this.checkCreditsLimit(billing);
            } catch (error) {
              if (error instanceof CreditsExceededError) {
                yield {
                  type: 'failed',
                  error: error.message,
                  creditsUsed: billing.currentCredits,
                };
                return;
              }
            }
          }
        }

        const sseEvent = this.convertRunEventToSSE(event);
        if (sseEvent) {
          yield sseEvent;
        }
      }

      // 等待完成并获取最终结果
      const finalOutput = streamResult.finalOutput;
      const creditsUsed = this.calculateCreditsFromStream(
        streamResult,
        billing,
      );

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
   * 从流式结果计算 credits（P1 计费模型优化）
   */
  private calculateCreditsFromStream(
    result: AnyStreamedRunResult,
    billing?: BillingParams,
  ): number {
    let credits = BILLING_CONSTANTS.BASE_CREDITS;

    // Token 费用
    const usage = result.state?._context?.usage;
    if (usage) {
      const totalTokens = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
      credits +=
        Math.ceil(totalTokens / 1000) * BILLING_CONSTANTS.CREDITS_PER_1K_TOKENS;
    }

    // 工具调用费用
    if (billing?.toolCallCount) {
      credits +=
        billing.toolCallCount * BILLING_CONSTANTS.CREDITS_PER_TOOL_CALL;
    }

    // 时长费用
    if (billing?.startTime) {
      const durationMinutes =
        (Date.now() - billing.startTime.getTime()) / 60000;
      credits +=
        Math.ceil(durationMinutes) * BILLING_CONSTANTS.CREDITS_PER_MINUTE;
    }

    return Math.ceil(credits);
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
   * 取消任务
   * DELETE /api/v1/agent/:id
   */
  async cancelTask(
    taskId: string,
  ): Promise<{ success: boolean; message: string; creditsUsed?: number }> {
    const task = this.tasks.get(taskId);

    if (!task) {
      return { success: false, message: 'Task not found' };
    }

    // 只能取消正在处理中的任务
    if (task.status !== 'pending' && task.status !== 'processing') {
      return {
        success: false,
        message: `Cannot cancel task in '${task.status}' status`,
        creditsUsed: task.creditsUsed,
      };
    }

    // 标记为已取消
    task.status = 'cancelled';
    task.error = 'Task cancelled by user';

    // 触发 abort 信号
    if (task.abortController) {
      task.abortController.abort();
    }

    // 关闭关联的浏览器会话
    if (task.sessionId) {
      try {
        await this.sessionManager.closeSession(task.sessionId);
        this.logger.debug(
          `Closed session ${task.sessionId} for cancelled task ${taskId}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to close session for cancelled task: ${error}`,
        );
      }
    }

    this.logger.log(`Task ${taskId} cancelled by user`);

    return {
      success: true,
      message: 'Task cancelled successfully',
      creditsUsed: task.creditsUsed,
    };
  }

  /**
   * 计算 credits 消耗（P1 计费模型优化）
   *
   * 计费公式：
   * credits = 基础费 + token费 + 工具调用费 + 时长费
   */
  private calculateCredits(
    result: AnyRunResult,
    billing?: BillingParams,
  ): number {
    let credits = BILLING_CONSTANTS.BASE_CREDITS;

    // Token 费用
    const usage = result.state?._context?.usage;
    if (usage) {
      const totalTokens = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
      credits +=
        Math.ceil(totalTokens / 1000) * BILLING_CONSTANTS.CREDITS_PER_1K_TOKENS;
    }

    // 工具调用费用
    if (billing?.toolCallCount) {
      credits +=
        billing.toolCallCount * BILLING_CONSTANTS.CREDITS_PER_TOOL_CALL;
    }

    // 时长费用
    if (billing?.startTime) {
      const durationMinutes =
        (Date.now() - billing.startTime.getTime()) / 60000;
      credits +=
        Math.ceil(durationMinutes) * BILLING_CONSTANTS.CREDITS_PER_MINUTE;
    }

    return Math.ceil(credits);
  }

  /**
   * 估算任务成本（基于历史数据）
   */
  estimateCost(input: CreateAgentTaskInput): {
    estimatedCredits: number;
    breakdown: {
      base: number;
      tokenEstimate: number;
      toolCallEstimate: number;
      durationEstimate: number;
    };
  } {
    // 基于 prompt 长度估算 token 消耗
    const promptTokens = Math.ceil(input.prompt.length / 4);
    const estimatedTotalTokens = promptTokens * 10; // 假设 10x 扩展

    // 基于 URL 数量估算工具调用
    const urlCount = input.urls?.length ?? 1;
    const estimatedToolCalls = urlCount * 5 + 5; // 每个 URL 约 5 次操作

    // 估算时长（分钟）
    const estimatedDuration = Math.ceil(estimatedToolCalls * 0.5);

    const breakdown = {
      base: BILLING_CONSTANTS.BASE_CREDITS,
      tokenEstimate:
        Math.ceil(estimatedTotalTokens / 1000) *
        BILLING_CONSTANTS.CREDITS_PER_1K_TOKENS,
      toolCallEstimate:
        estimatedToolCalls * BILLING_CONSTANTS.CREDITS_PER_TOOL_CALL,
      durationEstimate:
        estimatedDuration * BILLING_CONSTANTS.CREDITS_PER_MINUTE,
    };

    return {
      estimatedCredits: Math.ceil(
        breakdown.base +
          breakdown.tokenEstimate +
          breakdown.toolCallEstimate +
          breakdown.durationEstimate,
      ),
      breakdown,
    };
  }

  /**
   * 检查是否超过 maxCredits 限制
   */
  private checkCreditsLimit(billing: BillingParams): void {
    if (billing.maxCredits && billing.currentCredits >= billing.maxCredits) {
      throw new CreditsExceededError(
        billing.currentCredits,
        billing.maxCredits,
      );
    }
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

/**
 * Agent Service
 *
 * [INPUT]: Agent 任务请求
 * [OUTPUT]: 任务结果、SSE 事件流（含进度/计费）
 * [POS]: L3 Agent 核心业务逻辑，整合 @aiget/agents-core、Browser ports 与配额检查
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  Agent,
  run,
  type AgentOutputType,
  type JsonSchemaDefinition,
  type RunResult,
  type RunStreamEvent,
  type StreamedRunResult,
  type Usage,
} from '@aiget/agents-core';
import { BrowserAgentPortService } from '../browser/ports';
import { QuotaService } from '../quota/quota.service';
import { QuotaExceededError } from '../quota/quota.errors';
import { browserTools, type BrowserAgentContext } from './tools';
import type {
  CreateAgentTaskInput,
  AgentTaskResult,
  AgentStreamEvent,
  AgentTaskProgress,
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
  /** 已扣减的 credits（按 100 递增） */
  chargedCredits: number;
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

/** 任务取消错误 */
export class TaskCancelledError extends Error {
  constructor(message: string = 'Task cancelled by user') {
    super(message);
    this.name = 'TaskCancelledError';
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
  /** 每次检查/扣减的 credits 阈值 */
  CREDIT_CHECK_INTERVAL: 100,
} as const;

type BrowserAgent = Agent<BrowserAgentContext, AgentOutputType>;
type AgentRunResult = RunResult<BrowserAgentContext, BrowserAgent>;
type AgentStreamedResult = StreamedRunResult<BrowserAgentContext, BrowserAgent>;

const buildAgentOutputType = (
  schema?: Record<string, unknown>,
): AgentOutputType | undefined => {
  if (!schema) {
    return undefined;
  }

  const properties = schema as Record<string, Record<string, unknown>>;
  const required = Object.keys(properties);

  const jsonSchema: JsonSchemaDefinition = {
    type: 'json_schema',
    name: 'agent_output',
    strict: false,
    schema: {
      type: 'object',
      properties,
      required,
      additionalProperties: true,
    },
  };

  return jsonSchema;
};

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  /** 任务存储 */
  private readonly tasks = new Map<string, StoredTask>();

  /** 任务结果过期时间（10 分钟） */
  private readonly TASK_EXPIRY = 10 * 60 * 1000;

  constructor(
    private readonly browserAgentPort: BrowserAgentPortService,
    private readonly quotaService: QuotaService,
  ) {
    // 定期清理过期任务
    setInterval(() => this.cleanupExpiredTasks(), 60 * 1000);
  }

  /**
   * 执行 Agent 任务（非流式）
   */
  async executeTask(
    input: CreateAgentTaskInput,
    userId: string,
  ): Promise<AgentTaskResult> {
    const taskId = this.generateTaskId();
    const now = new Date();
    const abortController = new AbortController();

    // 创建任务记录
    const task: StoredTask = {
      id: taskId,
      status: 'pending',
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.TASK_EXPIRY),
      abortController,
    };
    this.tasks.set(taskId, task);

    // 初始化计费参数（P1 计费模型优化）
    const billing = this.createBillingParams(now, input.maxCredits);
    let session: { id: string } | null = null;

    try {
      await this.ensureMinimumQuota(userId, taskId);

      // 创建浏览器会话
      session = await this.browserAgentPort.createSession();
      task.sessionId = session.id;
      task.status = 'processing';

      // 构建 Agent
      const agent = this.buildAgent(input);

      // 构建上下文
      const context: BrowserAgentContext = {
        sessionId: session.id,
        browser: this.browserAgentPort,
        abortSignal: abortController.signal,
      };

      if (abortController.signal.aborted) {
        throw new TaskCancelledError();
      }

      // 构建用户 prompt
      const userPrompt = this.buildUserPrompt(input);

      // 使用流式执行以便统一处理取消/计费检查
      const streamResult: AgentStreamedResult = await run(agent, userPrompt, {
        context,
        maxTurns: 20,
        stream: true,
        signal: abortController.signal,
      });

      for await (const event of this.consumeStreamEvents({
        streamResult,
        billing,
        task,
        taskId,
        userId,
        abortController,
      })) {
        // 非流式模式忽略中间事件
        void event;
      }

      // 计算最终 credits
      const creditsUsed = this.calculateCreditsFromStream(
        streamResult,
        billing,
      );
      billing.currentCredits = creditsUsed;
      this.checkCreditsLimit(billing);
      await this.settleCharges(userId, taskId, billing, creditsUsed);

      // 更新任务状态
      task.status = 'completed';
      task.result = streamResult.finalOutput;
      task.creditsUsed = creditsUsed;

      return {
        id: taskId,
        status: 'completed',
        data: streamResult.finalOutput,
        creditsUsed,
        progress: this.buildProgress(billing),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const progress = this.buildProgress(billing);

      if (
        error instanceof TaskCancelledError ||
        abortController.signal.aborted
      ) {
        task.status = 'cancelled';
        task.error = errorMessage;
        task.creditsUsed = billing.currentCredits;
        return {
          id: taskId,
          status: 'cancelled',
          error: errorMessage,
          creditsUsed: billing.currentCredits,
          progress,
        };
      }

      this.logger.error(`Agent task ${taskId} failed: ${errorMessage}`);

      task.status = 'failed';
      task.error = errorMessage;
      task.creditsUsed = billing.currentCredits;

      // 如果是超限错误，返回已消耗的 credits
      if (error instanceof CreditsExceededError) {
        task.creditsUsed = error.used;
        return {
          id: taskId,
          status: 'failed',
          error: errorMessage,
          creditsUsed: error.used,
          progress,
        };
      }

      if (error instanceof QuotaExceededError) {
        return {
          id: taskId,
          status: 'failed',
          error: errorMessage,
          creditsUsed: billing.currentCredits,
          progress,
        };
      }

      return {
        id: taskId,
        status: 'failed',
        error: errorMessage,
        creditsUsed: billing.currentCredits,
        progress,
      };
    } finally {
      // 清理会话
      if (session) {
        await this.browserAgentPort.closeSession(session.id);
      }
    }
  }

  /**
   * 执行 Agent 任务（流式）
   * 返回异步生成器，用于 SSE 推送
   */
  async *executeTaskStream(
    input: CreateAgentTaskInput,
    userId: string,
  ): AsyncGenerator<AgentStreamEvent, void, unknown> {
    const taskId = this.generateTaskId();
    const now = new Date();
    const abortController = new AbortController();

    // 创建任务记录
    const task: StoredTask = {
      id: taskId,
      status: 'pending',
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.TASK_EXPIRY),
      abortController,
    };
    this.tasks.set(taskId, task);

    // 初始化计费参数（P1 计费模型优化）
    const billing = this.createBillingParams(now, input.maxCredits);
    let session: { id: string } | null = null;

    // 发送开始事件
    yield {
      type: 'started',
      id: taskId,
      expiresAt: task.expiresAt.toISOString(),
    };

    try {
      await this.ensureMinimumQuota(userId, taskId);

      // 创建浏览器会话
      session = await this.browserAgentPort.createSession();
      task.sessionId = session.id;
      task.status = 'processing';

      // 构建 Agent
      const agent = this.buildAgent(input);

      // 构建上下文
      const context: BrowserAgentContext = {
        sessionId: session.id,
        browser: this.browserAgentPort,
        abortSignal: abortController.signal,
      };

      if (abortController.signal.aborted) {
        throw new TaskCancelledError();
      }

      // 构建用户 prompt
      const userPrompt = this.buildUserPrompt(input);

      yield { type: 'thinking', content: '正在分析任务需求...' };

      // 使用流式 API 执行 Agent
      const streamResult: AgentStreamedResult = await run(agent, userPrompt, {
        context,
        maxTurns: 20,
        stream: true,
        signal: abortController.signal,
      });

      // 处理流式事件并追踪计费
      for await (const sseEvent of this.consumeStreamEvents({
        streamResult,
        billing,
        task,
        taskId,
        userId,
        abortController,
      })) {
        yield sseEvent;
      }

      // 等待完成并获取最终结果
      const finalOutput = streamResult.finalOutput as unknown;
      const creditsUsed = this.calculateCreditsFromStream(
        streamResult,
        billing,
      );
      billing.currentCredits = creditsUsed;
      this.checkCreditsLimit(billing);
      await this.settleCharges(userId, taskId, billing, creditsUsed);

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
      const progress = this.buildProgress(billing);

      if (
        error instanceof TaskCancelledError ||
        abortController.signal.aborted
      ) {
        task.status = 'cancelled';
        task.error = errorMessage;
        task.creditsUsed = billing.currentCredits;
        yield {
          type: 'failed',
          error: 'Task cancelled by user',
          creditsUsed: billing.currentCredits,
          progress,
        };
        return;
      }

      this.logger.error(`Agent task ${taskId} failed: ${errorMessage}`);

      task.status = 'failed';
      task.error = errorMessage;
      task.creditsUsed = billing.currentCredits;

      yield {
        type: 'failed',
        error: errorMessage,
        creditsUsed: billing.currentCredits,
        progress,
      };
    } finally {
      // 清理会话
      if (session) {
        await this.browserAgentPort.closeSession(session.id);
      }
    }
  }

  /**
   * 初始化计费参数
   */
  private createBillingParams(now: Date, maxCredits?: number): BillingParams {
    return {
      maxCredits,
      currentCredits: BILLING_CONSTANTS.BASE_CREDITS,
      toolCallCount: 0,
      startTime: now,
      chargedCredits: 0,
    };
  }

  /**
   * 构建 Agent 实例
   */
  private buildAgent(input: CreateAgentTaskInput): BrowserAgent {
    return new Agent<BrowserAgentContext, AgentOutputType>({
      name: 'Fetchx Browser Agent',
      model: 'gpt-4o',
      instructions: SYSTEM_INSTRUCTIONS,
      tools: browserTools,
      outputType: buildAgentOutputType(input.schema),
      modelSettings: {
        temperature: 0.7,
        maxTokens: 4096,
      },
    });
  }

  /**
   * 构建用户 prompt
   */
  private buildUserPrompt(input: CreateAgentTaskInput): string {
    let userPrompt = input.prompt;
    if (input.urls?.length) {
      userPrompt += `\n\n起始 URL：${input.urls.join(', ')}`;
    }
    return userPrompt;
  }

  /**
   * 构建任务进度
   */
  private buildProgress(billing: BillingParams): AgentTaskProgress {
    return {
      creditsUsed: billing.currentCredits,
      toolCallCount: billing.toolCallCount,
      elapsedMs: Date.now() - billing.startTime.getTime(),
    };
  }

  /**
   * 更新计费进度（基于当前 usage + 工具调用 + 时长）
   */
  private updateBillingFromUsage(billing: BillingParams, usage?: Usage): void {
    billing.currentCredits = this.calculateCreditsFromUsage(usage, billing);
  }

  /**
   * 确保用户至少有基础 credits
   */
  private async ensureMinimumQuota(
    userId: string,
    taskId: string,
  ): Promise<void> {
    const status = await this.quotaService.getStatus(userId);
    if (status.totalRemaining < BILLING_CONSTANTS.BASE_CREDITS) {
      this.logger.warn(
        `Agent task ${taskId} blocked: insufficient credits (remaining ${status.totalRemaining})`,
      );
      throw new QuotaExceededError(
        status.totalRemaining,
        BILLING_CONSTANTS.BASE_CREDITS,
      );
    }
  }

  /**
   * 按 100 credits 阶段性扣减/检查
   */
  private async applyQuotaCheckpoint(
    userId: string,
    taskId: string,
    billing: BillingParams,
  ): Promise<void> {
    while (
      billing.currentCredits - billing.chargedCredits >=
      BILLING_CONSTANTS.CREDIT_CHECK_INTERVAL
    ) {
      const nextCheckpoint =
        billing.chargedCredits + BILLING_CONSTANTS.CREDIT_CHECK_INTERVAL;
      await this.quotaService.deductOrThrow(
        userId,
        BILLING_CONSTANTS.CREDIT_CHECK_INTERVAL,
        `fetchx.agent:${taskId}:checkpoint:${nextCheckpoint}`,
      );
      billing.chargedCredits = nextCheckpoint;
    }
  }

  /**
   * 结算剩余 credits
   */
  private async settleCharges(
    userId: string,
    taskId: string,
    billing: BillingParams,
    creditsUsed: number,
  ): Promise<void> {
    const remaining = Math.max(0, creditsUsed - billing.chargedCredits);
    if (remaining <= 0) {
      return;
    }

    await this.quotaService.deductOrThrow(
      userId,
      remaining,
      `fetchx.agent:${taskId}:final`,
    );
    billing.chargedCredits += remaining;
  }

  /**
   * 处理流式事件并进行计费/取消检查
   */
  private async *consumeStreamEvents(params: {
    streamResult: AgentStreamedResult;
    billing: BillingParams;
    task: StoredTask;
    taskId: string;
    userId: string;
    abortController: AbortController;
  }): AsyncGenerator<AgentStreamEvent, void, unknown> {
    const { streamResult, billing, task, taskId, userId, abortController } =
      params;

    for await (const event of streamResult) {
      if (task.status === 'cancelled' || abortController.signal.aborted) {
        throw new TaskCancelledError();
      }

      if (event.type === 'run_item_stream_event') {
        const item = event.item;
        if (item.type === 'tool_call_item') {
          billing.toolCallCount++;
        }
      }

      this.updateBillingFromUsage(billing, streamResult.state?._context?.usage);
      task.creditsUsed = billing.currentCredits;

      try {
        this.checkCreditsLimit(billing);
      } catch (error) {
        abortController.abort(error);
        throw error;
      }

      try {
        await this.applyQuotaCheckpoint(userId, taskId, billing);
      } catch (error) {
        abortController.abort(error);
        throw error;
      }

      const sseEvent = this.convertRunEventToSSE(event);
      if (sseEvent) {
        yield sseEvent;
      }
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
        if (modelEvent.type === 'output_text_delta') {
          return { type: 'thinking', content: modelEvent.delta };
        }

        if (modelEvent.type === 'model') {
          const rawEvent = modelEvent.event as {
            type?: string;
            delta?: string;
          };
          if (rawEvent.type === 'reasoning-delta' && rawEvent.delta) {
            return { type: 'thinking', content: rawEvent.delta };
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
   * 基于 usage 计算 credits（P1 计费模型优化）
   */
  private calculateCreditsFromUsage(
    usage: Usage | undefined,
    billing?: BillingParams,
  ): number {
    let credits = BILLING_CONSTANTS.BASE_CREDITS;

    // Token 费用
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
   * 从流式结果计算 credits（P1 计费模型优化）
   */
  private calculateCreditsFromStream(
    result: AgentStreamedResult,
    billing?: BillingParams,
  ): number {
    const usage = result.state?._context?.usage;
    return this.calculateCreditsFromUsage(usage, billing);
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
      task.abortController.abort(new TaskCancelledError());
    }

    // 关闭关联的浏览器会话
    if (task.sessionId) {
      try {
        await this.browserAgentPort.closeSession(task.sessionId);
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
    result: AgentRunResult,
    billing?: BillingParams,
  ): number {
    const usage = result.state?._context?.usage;
    return this.calculateCreditsFromUsage(usage, billing);
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
    if (billing.maxCredits && billing.currentCredits > billing.maxCredits) {
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

/**
 * Agent Service
 *
 * [INPUT]: Agent 任务请求
 * [OUTPUT]: 任务结果、SSE 事件流（含进度/计费）
 * [POS]: L3 Agent 核心业务逻辑，整合 @aiget/agents-core、Browser ports 与任务管理
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  Agent,
  run,
  type AgentOutputType,
  type JsonSchemaDefinition,
  type StreamedRunResult,
} from '@aiget/agents-core';
import type { AgentTask } from '../../generated/prisma-main/client';
import { BrowserAgentPortService } from '../browser/ports';
import { browserTools, type BrowserAgentContext } from './tools';
import { AgentTaskRepository } from './agent-task.repository';
import { AgentTaskProgressStore } from './agent-task.progress.store';
import {
  AgentBillingService,
  CreditsExceededError,
  type BillingParams,
} from './agent-billing.service';
import { AgentStreamProcessor, TaskCancelledError } from './agent-stream.processor';
import type {
  CreateAgentTaskInput,
  AgentTaskResult,
  AgentStreamEvent,
  AgentTaskProgress,
} from './dto';

export { TaskCancelledError } from './agent-stream.processor';

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

/** 运行时任务句柄（仅本实例可见） */
interface RunningTask {
  /** 用于取消任务的 AbortController */
  abortController: AbortController;
  /** 关联的浏览器会话 ID */
  sessionId?: string;
}

const PROGRESS_TTL_MS = 24 * 60 * 60 * 1000;

type BrowserAgent = Agent<BrowserAgentContext, AgentOutputType>;
type AgentStreamedResult = StreamedRunResult<BrowserAgentContext, BrowserAgent>;

const buildAgentOutputType = (schema?: Record<string, unknown>): AgentOutputType | undefined => {
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

  /** 运行中任务句柄（仅本实例） */
  private readonly runningTasks = new Map<string, RunningTask>();

  constructor(
    private readonly browserAgentPort: BrowserAgentPortService,
    private readonly billingService: AgentBillingService,
    private readonly taskRepository: AgentTaskRepository,
    private readonly progressStore: AgentTaskProgressStore,
    private readonly streamProcessor: AgentStreamProcessor
  ) {}

  /**
   * 执行 Agent 任务（非流式）
   */
  async executeTask(input: CreateAgentTaskInput, userId: string): Promise<AgentTaskResult> {
    const taskId = this.generateTaskId();
    const now = new Date();
    const abortController = new AbortController();
    this.runningTasks.set(taskId, { abortController });

    // 创建持久化任务记录
    try {
      await this.taskRepository.createTask({
        id: taskId,
        userId,
        input,
        status: 'PENDING',
      });
    } catch (error) {
      this.runningTasks.delete(taskId);
      throw error;
    }

    // 初始化计费参数
    const billing = this.billingService.createBillingParams(now, input.maxCredits);
    await this.safeProgressOperation(
      () => this.progressStore.setProgress(taskId, this.billingService.buildProgress(billing)),
      'set initial progress'
    );
    let session: { id: string } | null = null;

    try {
      await this.billingService.ensureMinimumQuota(userId, taskId);

      // 创建浏览器会话
      session = await this.browserAgentPort.createSession();
      const runtime = this.runningTasks.get(taskId);
      if (runtime) {
        runtime.sessionId = session.id;
      }
      const activated = await this.taskRepository.updateTaskIfStatus(taskId, ['PENDING'], {
        status: 'PROCESSING',
        startedAt: new Date(),
      });
      if (!activated) {
        throw new TaskCancelledError();
      }

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

      for await (const event of this.streamProcessor.consumeStreamEvents({
        streamResult,
        billing,
        taskId,
        userId,
        abortController,
      })) {
        // 非流式模式忽略中间事件
        void event;
      }

      // 计算最终 credits
      const creditsUsed = this.billingService.calculateCreditsFromStream(streamResult, billing);
      billing.currentCredits = creditsUsed;
      await this.throwIfTaskCancelled(taskId, userId);
      this.billingService.checkCreditsLimit(billing);
      await this.billingService.settleCharges(userId, taskId, billing, creditsUsed);

      // 更新任务状态
      const progress = this.billingService.buildProgress(billing);
      const completed = await this.taskRepository.updateTaskIfStatus(
        taskId,
        ['PENDING', 'PROCESSING'],
        {
          status: 'COMPLETED',
          result: streamResult.finalOutput,
          creditsUsed,
          toolCallCount: progress.toolCallCount,
          elapsedMs: progress.elapsedMs,
          completedAt: new Date(),
        }
      );
      if (!completed) {
        await this.taskRepository.updateTaskMetrics(taskId, {
          creditsUsed,
          toolCallCount: progress.toolCallCount,
          elapsedMs: progress.elapsedMs,
        });
        throw new TaskCancelledError();
      }
      await this.safeProgressOperation(
        () => this.progressStore.clearProgress(taskId),
        'clear progress'
      );

      return {
        id: taskId,
        status: 'completed',
        data: streamResult.finalOutput,
        creditsUsed,
        progress,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const progress = this.billingService.buildProgress(billing);
      const creditsUsed =
        error instanceof CreditsExceededError ? error.used : billing.currentCredits;

      if (error instanceof TaskCancelledError || abortController.signal.aborted) {
        // 取消需要按已消耗结算（不退款）
        try {
          await this.billingService.settleCharges(userId, taskId, billing, creditsUsed);
        } catch (settleError) {
          this.logger.warn(
            `Failed to settle charges for cancelled task ${taskId}: ${settleError instanceof Error ? settleError.message : String(settleError)}`
          );
        }
        await this.persistCancelledTask({
          taskId,
          userId,
          errorMessage,
          creditsUsed,
          progress,
        });
        await this.safeProgressOperation(
          () => this.progressStore.clearProgress(taskId),
          'clear progress'
        );
        await this.safeProgressOperation(
          () => this.progressStore.clearCancel(taskId),
          'clear cancel'
        );
        return {
          id: taskId,
          status: 'cancelled',
          error: errorMessage,
          creditsUsed,
          progress,
        };
      }

      this.logger.error(`Agent task ${taskId} failed: ${errorMessage}`);

      const failed = await this.taskRepository.updateTaskIfStatus(
        taskId,
        ['PENDING', 'PROCESSING'],
        {
          status: 'FAILED',
          error: errorMessage,
          creditsUsed,
          toolCallCount: progress.toolCallCount,
          elapsedMs: progress.elapsedMs,
          completedAt: new Date(),
        }
      );
      if (failed) {
        await this.billingService.refundChargesOnFailure(userId, taskId);
      } else {
        const latest = await this.taskRepository.getTaskForUser(taskId, userId);
        if (latest?.status === 'FAILED') {
          await this.billingService.refundChargesOnFailure(userId, taskId);
        } else if (latest?.status === 'CANCELLED') {
          await this.taskRepository.updateTaskMetrics(taskId, {
            creditsUsed,
            toolCallCount: progress.toolCallCount,
            elapsedMs: progress.elapsedMs,
          });
        }
      }
      await this.safeProgressOperation(
        () => this.progressStore.clearProgress(taskId),
        'clear progress'
      );

      return {
        id: taskId,
        status: 'failed',
        error: errorMessage,
        creditsUsed,
        progress,
      };
    } finally {
      // 清理会话
      if (session) {
        await this.browserAgentPort.closeSession(session.id);
      }
      await this.safeProgressOperation(
        () => this.progressStore.clearCancel(taskId),
        'clear cancel'
      );
      this.runningTasks.delete(taskId);
    }
  }

  /**
   * 执行 Agent 任务（流式）
   * 返回异步生成器，用于 SSE 推送
   */
  async *executeTaskStream(
    input: CreateAgentTaskInput,
    userId: string
  ): AsyncGenerator<AgentStreamEvent, void, unknown> {
    const taskId = this.generateTaskId();
    const now = new Date();
    const abortController = new AbortController();
    this.runningTasks.set(taskId, { abortController });

    // 创建持久化任务记录
    try {
      await this.taskRepository.createTask({
        id: taskId,
        userId,
        input,
        status: 'PENDING',
      });
    } catch (error) {
      this.runningTasks.delete(taskId);
      throw error;
    }

    // 初始化计费参数
    const billing = this.billingService.createBillingParams(now, input.maxCredits);
    await this.safeProgressOperation(
      () => this.progressStore.setProgress(taskId, this.billingService.buildProgress(billing)),
      'set initial progress'
    );
    let session: { id: string } | null = null;

    // 发送开始事件
    yield {
      type: 'started',
      id: taskId,
      expiresAt: new Date(now.getTime() + PROGRESS_TTL_MS).toISOString(),
    };

    try {
      await this.billingService.ensureMinimumQuota(userId, taskId);

      // 创建浏览器会话
      session = await this.browserAgentPort.createSession();
      const runtime = this.runningTasks.get(taskId);
      if (runtime) {
        runtime.sessionId = session.id;
      }
      const activated = await this.taskRepository.updateTaskIfStatus(taskId, ['PENDING'], {
        status: 'PROCESSING',
        startedAt: new Date(),
      });
      if (!activated) {
        throw new TaskCancelledError();
      }

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
      for await (const sseEvent of this.streamProcessor.consumeStreamEvents({
        streamResult,
        billing,
        taskId,
        userId,
        abortController,
      })) {
        yield sseEvent;
      }

      // 等待完成并获取最终结果
      const finalOutput = streamResult.finalOutput as unknown;
      const creditsUsed = this.billingService.calculateCreditsFromStream(streamResult, billing);
      billing.currentCredits = creditsUsed;
      await this.throwIfTaskCancelled(taskId, userId);
      this.billingService.checkCreditsLimit(billing);
      await this.billingService.settleCharges(userId, taskId, billing, creditsUsed);

      // 更新任务状态
      const progress = this.billingService.buildProgress(billing);
      const completed = await this.taskRepository.updateTaskIfStatus(
        taskId,
        ['PENDING', 'PROCESSING'],
        {
          status: 'COMPLETED',
          result: finalOutput,
          creditsUsed,
          toolCallCount: progress.toolCallCount,
          elapsedMs: progress.elapsedMs,
          completedAt: new Date(),
        }
      );
      if (!completed) {
        await this.taskRepository.updateTaskMetrics(taskId, {
          creditsUsed,
          toolCallCount: progress.toolCallCount,
          elapsedMs: progress.elapsedMs,
        });
        throw new TaskCancelledError();
      }
      await this.safeProgressOperation(
        () => this.progressStore.clearProgress(taskId),
        'clear progress'
      );

      // 发送完成事件
      yield {
        type: 'complete',
        data: finalOutput,
        creditsUsed,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const progress = this.billingService.buildProgress(billing);
      const creditsUsed =
        error instanceof CreditsExceededError ? error.used : billing.currentCredits;

      if (error instanceof TaskCancelledError || abortController.signal.aborted) {
        try {
          await this.billingService.settleCharges(userId, taskId, billing, creditsUsed);
        } catch (settleError) {
          this.logger.warn(
            `Failed to settle charges for cancelled task ${taskId}: ${settleError instanceof Error ? settleError.message : String(settleError)}`
          );
        }
        await this.persistCancelledTask({
          taskId,
          userId,
          errorMessage,
          creditsUsed,
          progress,
        });
        await this.safeProgressOperation(
          () => this.progressStore.clearProgress(taskId),
          'clear progress'
        );
        await this.safeProgressOperation(
          () => this.progressStore.clearCancel(taskId),
          'clear cancel'
        );
        yield {
          type: 'failed',
          error: 'Task cancelled by user',
          creditsUsed,
          progress,
        };
        return;
      }

      this.logger.error(`Agent task ${taskId} failed: ${errorMessage}`);

      const failed = await this.taskRepository.updateTaskIfStatus(
        taskId,
        ['PENDING', 'PROCESSING'],
        {
          status: 'FAILED',
          error: errorMessage,
          creditsUsed,
          toolCallCount: progress.toolCallCount,
          elapsedMs: progress.elapsedMs,
          completedAt: new Date(),
        }
      );
      if (failed) {
        await this.billingService.refundChargesOnFailure(userId, taskId);
      } else {
        const latest = await this.taskRepository.getTaskForUser(taskId, userId);
        if (latest?.status === 'FAILED') {
          await this.billingService.refundChargesOnFailure(userId, taskId);
        } else if (latest?.status === 'CANCELLED') {
          await this.taskRepository.updateTaskMetrics(taskId, {
            creditsUsed,
            toolCallCount: progress.toolCallCount,
            elapsedMs: progress.elapsedMs,
          });
        }
      }
      await this.safeProgressOperation(
        () => this.progressStore.clearProgress(taskId),
        'clear progress'
      );

      yield {
        type: 'failed',
        error: errorMessage,
        creditsUsed,
        progress,
      };
    } finally {
      // 清理会话
      if (session) {
        await this.browserAgentPort.closeSession(session.id);
      }
      await this.safeProgressOperation(
        () => this.progressStore.clearCancel(taskId),
        'clear cancel'
      );
      this.runningTasks.delete(taskId);
    }
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
   * 从持久化任务记录构建进度快照
   */
  private buildProgressFromTask(task: AgentTask): AgentTaskProgress | null {
    if (task.creditsUsed === null && task.toolCallCount === null && task.elapsedMs === null) {
      return null;
    }

    return {
      creditsUsed: task.creditsUsed ?? 0,
      toolCallCount: task.toolCallCount ?? 0,
      elapsedMs: task.elapsedMs ?? 0,
    };
  }

  private async safeProgressOperation<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.logger.warn(
        `Agent progress store ${context} failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  private async persistCancelledTask(params: {
    taskId: string;
    userId: string;
    errorMessage: string;
    creditsUsed: number;
    progress: AgentTaskProgress;
  }): Promise<void> {
    const cancelled = await this.taskRepository.updateTaskIfStatus(
      params.taskId,
      ['PENDING', 'PROCESSING'],
      {
        status: 'CANCELLED',
        error: params.errorMessage,
        creditsUsed: params.creditsUsed,
        toolCallCount: params.progress.toolCallCount,
        elapsedMs: params.progress.elapsedMs,
        cancelledAt: new Date(),
      }
    );

    if (cancelled) {
      return;
    }

    const latest = await this.taskRepository.getTaskForUser(params.taskId, params.userId);

    if (latest?.status !== 'CANCELLED') {
      return;
    }

    await this.taskRepository.updateTaskMetrics(params.taskId, {
      creditsUsed: params.creditsUsed,
      toolCallCount: params.progress.toolCallCount,
      elapsedMs: params.progress.elapsedMs,
    });
  }

  private async throwIfTaskCancelled(taskId: string, userId: string): Promise<void> {
    const task = await this.taskRepository.getTaskForUser(taskId, userId);
    if (task?.status === 'CANCELLED') {
      throw new TaskCancelledError();
    }
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string, userId: string): Promise<AgentTaskResult | null> {
    const task = await this.taskRepository.getTaskForUser(taskId, userId);
    if (!task) {
      return null;
    }

    const progress =
      (await this.safeProgressOperation(
        () => this.progressStore.getProgress(taskId),
        'get progress'
      )) ?? this.buildProgressFromTask(task);

    const status = task.status.toLowerCase() as AgentTaskResult['status'];
    const creditsUsed = progress?.creditsUsed ?? task.creditsUsed ?? undefined;

    return {
      id: task.id,
      status,
      data: task.result ?? undefined,
      creditsUsed,
      error: task.error ?? undefined,
      progress: progress ?? undefined,
    };
  }

  /**
   * 取消任务
   * DELETE /api/v1/agent/:id
   */
  async cancelTask(
    taskId: string,
    userId: string
  ): Promise<{ success: boolean; message: string; creditsUsed?: number }> {
    const task = await this.taskRepository.getTaskForUser(taskId, userId);

    if (!task) {
      return { success: false, message: 'Task not found' };
    }

    // 只能取消正在处理中的任务
    const status = task.status.toLowerCase();
    if (status !== 'pending' && status !== 'processing') {
      return {
        success: false,
        message: `Cannot cancel task in '${status}' status`,
        creditsUsed: task.creditsUsed ?? undefined,
      };
    }

    const progress = await this.safeProgressOperation(
      () => this.progressStore.getProgress(taskId),
      'get progress'
    );

    await this.safeProgressOperation(
      () => this.progressStore.requestCancel(taskId),
      'request cancel'
    );

    const cancelled = await this.taskRepository.updateTaskIfStatus(
      taskId,
      ['PENDING', 'PROCESSING'],
      {
        status: 'CANCELLED',
        error: 'Task cancelled by user',
        cancelledAt: new Date(),
        creditsUsed: progress?.creditsUsed ?? task.creditsUsed ?? undefined,
        toolCallCount: progress?.toolCallCount ?? task.toolCallCount ?? undefined,
        elapsedMs: progress?.elapsedMs ?? task.elapsedMs ?? undefined,
      }
    );

    if (!cancelled) {
      const latest = await this.taskRepository.getTaskForUser(taskId, userId);
      const latestStatus = latest?.status.toLowerCase() ?? status;
      return {
        success: false,
        message: `Cannot cancel task in '${latestStatus}' status`,
        creditsUsed: latest?.creditsUsed ?? task.creditsUsed ?? undefined,
      };
    }

    // 触发 abort 信号
    const runtime = this.runningTasks.get(taskId);
    if (runtime?.abortController) {
      runtime.abortController.abort(new TaskCancelledError());
    }

    // 关闭关联的浏览器会话
    if (runtime?.sessionId) {
      try {
        await this.browserAgentPort.closeSession(runtime.sessionId);
        this.logger.debug(`Closed session ${runtime.sessionId} for cancelled task ${taskId}`);
      } catch (error) {
        this.logger.warn(`Failed to close session for cancelled task: ${error}`);
      }
    }

    this.logger.log(`Task ${taskId} cancelled by user`);
    return {
      success: true,
      message: 'Task cancelled successfully',
      creditsUsed: progress?.creditsUsed ?? task.creditsUsed ?? undefined,
    };
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
    return this.billingService.estimateCost(input);
  }

  /**
   * 生成任务 ID
   */
  private generateTaskId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `at_${timestamp}_${random}`;
  }
}

/**
 * Agent Service
 *
 * [INPUT]: Agent 任务请求（可选 model；未传使用 Admin 默认）+ Browser ports
 * [OUTPUT]: 任务结果、SSE 事件流（含进度/计费）
 * [POS]: L3 Agent 核心业务逻辑，整合 @openai/agents-core、Browser ports 与任务管理；LLM provider/model 由 Admin 动态配置决定（Runner 使用动态 provider）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  Agent,
  Runner,
  type Model,
  type ModelProvider,
  type AgentOutputType,
  type JsonSchemaDefinition,
  type StreamedRunResult,
} from '@openai/agents-core';
import type { AgentTask } from '../../generated/prisma-main/client';
import {
  BrowserAgentPortService,
  type BrowserAgentSession,
} from '../browser/ports';
import { LlmRoutingService } from '../llm';
import { browserTools, type BrowserAgentContext } from './tools';
import { AgentTaskRepository } from './agent-task.repository';
import { AgentTaskProgressStore } from './agent-task.progress.store';
import {
  AgentBillingService,
  CreditsExceededError,
} from './agent-billing.service';
import {
  AgentStreamProcessor,
  TaskCancelledError,
} from './agent-stream.processor';
import type {
  CreateAgentTaskInput,
  AgentOutput,
  AgentTaskResult,
  AgentStreamEvent,
  AgentTaskProgress,
} from './dto';

export { TaskCancelledError } from './agent-stream.processor';

const SYSTEM_INSTRUCTIONS = `你是 Browser Agent，一个专业的网页数据收集助手。

你的任务是根据用户的 prompt，通过浏览器操作找到并提取所需数据。

工作流程：
1. 分析用户需求，确定需要收集的数据
2. 如果没有提供 URL，使用 web_search 搜索相关网站
3. 使用 browser_open 打开目标页面
4. 使用 browser_snapshot 获取页面结构
5. 使用 browser_action 或 browser_action_batch 执行操作
6. 多次迭代直到找到所有需要的数据
7. 返回结构化的结果

注意事项：
- 每次操作后都应获取新的 snapshot 以了解页面变化
- 使用 @ref 格式（如 @e1）进行元素定位，比 CSS 选择器更可靠
- 连续操作优先使用 browser_action_batch，减少往返
- 应尽量解决用户的问题，如果实在解决不了，返回 agent 友好的错误信息
- 控制操作次数，避免无限循环`;

interface RunningTask {
  abortController: AbortController;
  sessionId?: string;
}

const PROGRESS_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_AGENT_TURNS = 100;

type BrowserAgent = Agent<BrowserAgentContext, AgentOutputType>;
type AgentStreamedResult = StreamedRunResult<BrowserAgentContext, BrowserAgent>;

const buildAgentOutputType = (
  output: AgentOutput,
): AgentOutputType | undefined => {
  if (output.type !== 'json_schema') {
    return undefined;
  }

  const properties = output.schema.properties as unknown as Record<string, any>;
  const required = output.schema.required ?? [];

  const jsonSchema: JsonSchemaDefinition = {
    type: 'json_schema',
    name: output.name ?? 'agent_output',
    strict: output.strict ?? false,
    schema: {
      type: 'object',
      properties,
      required,
      additionalProperties:
        output.schema.additionalProperties === true
          ? (true as const)
          : (false as const),
    },
  };

  return jsonSchema;
};

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly runningTasks = new Map<string, RunningTask>();

  constructor(
    private readonly browserAgentPort: BrowserAgentPortService,
    private readonly llmRoutingService: LlmRoutingService,
    private readonly billingService: AgentBillingService,
    private readonly taskRepository: AgentTaskRepository,
    private readonly progressStore: AgentTaskProgressStore,
    private readonly streamProcessor: AgentStreamProcessor,
  ) {}

  private buildZeroProgress(startTime: Date): AgentTaskProgress {
    return {
      creditsUsed: 0,
      toolCallCount: 0,
      elapsedMs: Date.now() - startTime.getTime(),
    };
  }

  async executeTask(
    input: CreateAgentTaskInput,
    userId: string,
  ): Promise<AgentTaskResult> {
    const taskId = this.generateTaskId();
    const now = new Date();
    const abortController = new AbortController();
    this.runningTasks.set(taskId, { abortController });

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

    let llmModel: Model;
    let llmModelProvider: ModelProvider;
    try {
      const llmRoute = await this.llmRoutingService.resolveAgentModel(
        input.model,
      );
      llmModel = llmRoute.model;
      llmModelProvider = llmRoute.modelProvider;
    } catch (error) {
      const llmConfigError =
        error instanceof Error ? error.message : String(error);
      const progress = this.buildZeroProgress(now);
      try {
        await this.taskRepository.updateTaskIfStatus(taskId, ['PENDING'], {
          status: 'FAILED',
          error: llmConfigError,
          creditsUsed: 0,
          toolCallCount: 0,
          elapsedMs: progress.elapsedMs,
          completedAt: new Date(),
        });
      } finally {
        await this.safeProgressOperation(
          () => this.progressStore.clearCancel(taskId),
          'clear cancel',
        );
        await this.safeProgressOperation(
          () => this.progressStore.clearProgress(taskId),
          'clear progress',
        );
        this.runningTasks.delete(taskId);
      }

      return {
        id: taskId,
        status: 'failed',
        error: llmConfigError,
        creditsUsed: 0,
        progress,
      };
    }

    const billing = this.billingService.createBillingParams(
      now,
      input.maxCredits,
    );
    await this.safeProgressOperation(
      () =>
        this.progressStore.setProgress(
          taskId,
          this.billingService.buildProgress(billing),
        ),
      'set initial progress',
    );
    const browserPort = this.browserAgentPort.forUser(userId);
    let sessionPromise: Promise<BrowserAgentSession> | null = null;

    try {
      await this.billingService.ensureMinimumQuota(userId, taskId);

      const activated = await this.taskRepository.updateTaskIfStatus(
        taskId,
        ['PENDING'],
        {
          status: 'PROCESSING',
          startedAt: new Date(),
        },
      );
      if (!activated) {
        throw new TaskCancelledError();
      }

      const agent = this.buildAgent(input, llmModel);

      const context: BrowserAgentContext = {
        browser: browserPort,
        getSessionId: async () => {
          if (abortController.signal.aborted) {
            throw new TaskCancelledError();
          }
          if (!sessionPromise) {
            sessionPromise = browserPort.createSession();
          }
          const session = await sessionPromise;
          const runtime = this.runningTasks.get(taskId);
          if (runtime && !runtime.sessionId) {
            runtime.sessionId = session.id;
          }
          return session.id;
        },
        abortSignal: abortController.signal,
      };

      if (abortController.signal.aborted) {
        throw new TaskCancelledError();
      }

      const userPrompt = this.buildUserPrompt(input);

      const runner = this.buildRunner(llmModelProvider);
      const streamResult: AgentStreamedResult = await runner.run(
        agent,
        userPrompt,
        {
          context,
          maxTurns: MAX_AGENT_TURNS,
          stream: true,
          signal: abortController.signal,
        },
      );

      for await (const event of this.streamProcessor.consumeStreamEvents({
        streamResult,
        billing,
        taskId,
        userId,
        abortController,
      })) {
        void event;
      }

      const creditsUsed = this.billingService.calculateCreditsFromStream(
        streamResult,
        billing,
      );
      billing.currentCredits = creditsUsed;
      await this.throwIfTaskCancelled(taskId, userId);
      this.billingService.checkCreditsLimit(billing);
      await this.billingService.settleCharges(
        userId,
        taskId,
        billing,
        creditsUsed,
      );

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
        },
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
        'clear progress',
      );

      return {
        id: taskId,
        status: 'completed',
        data: streamResult.finalOutput,
        creditsUsed,
        progress,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const progress = this.billingService.buildProgress(billing);
      const creditsUsed =
        error instanceof CreditsExceededError
          ? error.used
          : billing.currentCredits;

      if (
        error instanceof TaskCancelledError ||
        abortController.signal.aborted
      ) {
        try {
          await this.billingService.settleCharges(
            userId,
            taskId,
            billing,
            creditsUsed,
          );
        } catch (settleError) {
          this.logger.warn(
            `Failed to settle charges for cancelled task ${taskId}: ${settleError instanceof Error ? settleError.message : String(settleError)}`,
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
          'clear progress',
        );
        await this.safeProgressOperation(
          () => this.progressStore.clearCancel(taskId),
          'clear cancel',
        );
        return {
          id: taskId,
          status: 'cancelled',
          error: 'Task cancelled by user',
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
        },
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
        'clear progress',
      );

      return {
        id: taskId,
        status: 'failed',
        error: errorMessage,
        creditsUsed,
        progress,
      };
    } finally {
      const runtime = this.runningTasks.get(taskId);
      if (runtime?.sessionId) {
        try {
          await browserPort.closeSession(runtime.sessionId);
        } catch (error) {
          this.logger.warn(
            `Failed to close browser session ${runtime.sessionId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      await this.safeProgressOperation(
        () => this.progressStore.clearCancel(taskId),
        'clear cancel',
      );
      this.runningTasks.delete(taskId);
    }
  }

  async *executeTaskStream(
    input: CreateAgentTaskInput,
    userId: string,
  ): AsyncGenerator<AgentStreamEvent, void, unknown> {
    const taskId = this.generateTaskId();
    const now = new Date();
    const abortController = new AbortController();
    this.runningTasks.set(taskId, { abortController });

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

    const billing = this.billingService.createBillingParams(
      now,
      input.maxCredits,
    );
    await this.safeProgressOperation(
      () =>
        this.progressStore.setProgress(
          taskId,
          this.billingService.buildProgress(billing),
        ),
      'set initial progress',
    );
    const browserPort = this.browserAgentPort.forUser(userId);
    let sessionPromise: Promise<BrowserAgentSession> | null = null;

    yield {
      type: 'started',
      id: taskId,
      expiresAt: new Date(now.getTime() + PROGRESS_TTL_MS).toISOString(),
    };

    let llmModel: Model;
    let llmModelProvider: ModelProvider;
    try {
      const llmRoute = await this.llmRoutingService.resolveAgentModel(
        input.model,
      );
      llmModel = llmRoute.model;
      llmModelProvider = llmRoute.modelProvider;
    } catch (error) {
      const llmConfigError =
        error instanceof Error ? error.message : String(error);
      const progress = this.buildZeroProgress(now);
      try {
        await this.taskRepository.updateTaskIfStatus(taskId, ['PENDING'], {
          status: 'FAILED',
          error: llmConfigError,
          creditsUsed: 0,
          toolCallCount: 0,
          elapsedMs: progress.elapsedMs,
          completedAt: new Date(),
        });
      } finally {
        await this.safeProgressOperation(
          () => this.progressStore.clearCancel(taskId),
          'clear cancel',
        );
        await this.safeProgressOperation(
          () => this.progressStore.clearProgress(taskId),
          'clear progress',
        );
        this.runningTasks.delete(taskId);
      }

      yield {
        type: 'failed',
        error: llmConfigError,
        creditsUsed: 0,
        progress,
      };
      return;
    }

    try {
      await this.billingService.ensureMinimumQuota(userId, taskId);

      const activated = await this.taskRepository.updateTaskIfStatus(
        taskId,
        ['PENDING'],
        {
          status: 'PROCESSING',
          startedAt: new Date(),
        },
      );
      if (!activated) {
        throw new TaskCancelledError();
      }

      const agent = this.buildAgent(input, llmModel);

      const context: BrowserAgentContext = {
        browser: browserPort,
        getSessionId: async () => {
          if (abortController.signal.aborted) {
            throw new TaskCancelledError();
          }
          if (!sessionPromise) {
            sessionPromise = browserPort.createSession();
          }
          const session = await sessionPromise;
          const runtime = this.runningTasks.get(taskId);
          if (runtime && !runtime.sessionId) {
            runtime.sessionId = session.id;
          }
          return session.id;
        },
        abortSignal: abortController.signal,
      };

      if (abortController.signal.aborted) {
        throw new TaskCancelledError();
      }

      const userPrompt = this.buildUserPrompt(input);

      yield { type: 'textDelta', delta: '正在分析任务需求...\n' };

      const runner = this.buildRunner(llmModelProvider);
      const streamResult: AgentStreamedResult = await runner.run(
        agent,
        userPrompt,
        {
          context,
          maxTurns: MAX_AGENT_TURNS,
          stream: true,
          signal: abortController.signal,
        },
      );

      for await (const sseEvent of this.streamProcessor.consumeStreamEvents({
        streamResult,
        billing,
        taskId,
        userId,
        abortController,
      })) {
        yield sseEvent;
      }

      const finalOutput = streamResult.finalOutput;
      const creditsUsed = this.billingService.calculateCreditsFromStream(
        streamResult,
        billing,
      );
      billing.currentCredits = creditsUsed;
      await this.throwIfTaskCancelled(taskId, userId);
      this.billingService.checkCreditsLimit(billing);
      await this.billingService.settleCharges(
        userId,
        taskId,
        billing,
        creditsUsed,
      );

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
        },
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
        'clear progress',
      );

      yield {
        type: 'complete',
        data: finalOutput,
        creditsUsed,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const progress = this.billingService.buildProgress(billing);
      const creditsUsed =
        error instanceof CreditsExceededError
          ? error.used
          : billing.currentCredits;

      if (
        error instanceof TaskCancelledError ||
        abortController.signal.aborted
      ) {
        try {
          await this.billingService.settleCharges(
            userId,
            taskId,
            billing,
            creditsUsed,
          );
        } catch (settleError) {
          this.logger.warn(
            `Failed to settle charges for cancelled task ${taskId}: ${settleError instanceof Error ? settleError.message : String(settleError)}`,
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
          'clear progress',
        );
        await this.safeProgressOperation(
          () => this.progressStore.clearCancel(taskId),
          'clear cancel',
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
        },
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
        'clear progress',
      );

      yield {
        type: 'failed',
        error: errorMessage,
        creditsUsed,
        progress,
      };
    } finally {
      const runtime = this.runningTasks.get(taskId);
      if (runtime?.sessionId) {
        try {
          await browserPort.closeSession(runtime.sessionId);
        } catch (error) {
          this.logger.warn(
            `Failed to close browser session ${runtime.sessionId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      await this.safeProgressOperation(
        () => this.progressStore.clearCancel(taskId),
        'clear cancel',
      );
      this.runningTasks.delete(taskId);
    }
  }

  private buildAgent(input: CreateAgentTaskInput, model: Model): BrowserAgent {
    // agents-openai 的 Chat Completions 实现会默认带上 `response_format: { type: 'text' }`。
    // 部分 OpenAI-compatible 网关（尤其是 Gemini/Claude 代理）会对该字段报 400 invalid argument。
    // 这里在“纯文本输出”场景下显式移除它（通过 providerData 覆盖为 undefined，使 JSON.stringify 丢弃字段）。
    const providerData: Record<string, unknown> | undefined =
      input.output.type === 'json_schema'
        ? undefined
        : { response_format: undefined };

    return new Agent<BrowserAgentContext, AgentOutputType>({
      name: 'Fetchx Browser Agent',
      model,
      instructions: SYSTEM_INSTRUCTIONS,
      tools: browserTools,
      outputType: buildAgentOutputType(input.output),
      modelSettings: {
        temperature: 0.7,
        maxTokens: 4096,
        ...(providerData ? { providerData } : {}),
      },
    });
  }

  private buildRunner(modelProvider: ModelProvider): Runner {
    return new Runner({ modelProvider });
  }

  private buildUserPrompt(input: CreateAgentTaskInput): string {
    let userPrompt = input.prompt;
    if (input.urls?.length) {
      userPrompt += `\n\n起始 URL：${input.urls.join(', ')}`;
    }
    return userPrompt;
  }

  private buildProgressFromTask(task: AgentTask): AgentTaskProgress | null {
    if (
      task.creditsUsed === null &&
      task.toolCallCount === null &&
      task.elapsedMs === null
    ) {
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
    context: string,
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.logger.warn(
        `Agent progress store ${context} failed: ${error instanceof Error ? error.message : String(error)}`,
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
      },
    );

    if (cancelled) {
      return;
    }

    const latest = await this.taskRepository.getTaskForUser(
      params.taskId,
      params.userId,
    );

    if (latest?.status !== 'CANCELLED') {
      return;
    }

    await this.taskRepository.updateTaskMetrics(params.taskId, {
      creditsUsed: params.creditsUsed,
      toolCallCount: params.progress.toolCallCount,
      elapsedMs: params.progress.elapsedMs,
    });
  }

  private async throwIfTaskCancelled(
    taskId: string,
    userId: string,
  ): Promise<void> {
    const task = await this.taskRepository.getTaskForUser(taskId, userId);
    if (task?.status === 'CANCELLED') {
      throw new TaskCancelledError();
    }
  }

  async getTaskStatus(
    taskId: string,
    userId: string,
  ): Promise<AgentTaskResult | null> {
    const task = await this.taskRepository.getTaskForUser(taskId, userId);
    if (!task) {
      return null;
    }

    const progress =
      (await this.safeProgressOperation(
        () => this.progressStore.getProgress(taskId),
        'get progress',
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

  async cancelTask(
    taskId: string,
    userId: string,
  ): Promise<
    | { status: 'not_found' }
    | { status: 'invalid_status'; currentStatus: string; creditsUsed?: number }
    | { status: 'cancelled'; creditsUsed?: number }
  > {
    const task = await this.taskRepository.getTaskForUser(taskId, userId);

    if (!task) {
      return { status: 'not_found' };
    }

    const status = task.status.toLowerCase();
    if (status !== 'pending' && status !== 'processing') {
      return {
        status: 'invalid_status',
        currentStatus: status,
        creditsUsed: task.creditsUsed ?? undefined,
      };
    }

    const progress = await this.safeProgressOperation(
      () => this.progressStore.getProgress(taskId),
      'get progress',
    );

    await this.safeProgressOperation(
      () => this.progressStore.requestCancel(taskId),
      'request cancel',
    );

    const cancelled = await this.taskRepository.updateTaskIfStatus(
      taskId,
      ['PENDING', 'PROCESSING'],
      {
        status: 'CANCELLED',
        error: 'Task cancelled by user',
        cancelledAt: new Date(),
        creditsUsed: progress?.creditsUsed ?? task.creditsUsed ?? undefined,
        toolCallCount:
          progress?.toolCallCount ?? task.toolCallCount ?? undefined,
        elapsedMs: progress?.elapsedMs ?? task.elapsedMs ?? undefined,
      },
    );

    if (!cancelled) {
      const latest = await this.taskRepository.getTaskForUser(taskId, userId);
      const latestStatus = latest?.status.toLowerCase() ?? status;
      return {
        status: 'invalid_status',
        currentStatus: latestStatus,
        creditsUsed: latest?.creditsUsed ?? task.creditsUsed ?? undefined,
      };
    }

    const runtime = this.runningTasks.get(taskId);
    if (runtime?.abortController) {
      runtime.abortController.abort(new TaskCancelledError());
    }

    if (runtime?.sessionId) {
      try {
        const browserPort = this.browserAgentPort.forUser(userId);
        await browserPort.closeSession(runtime.sessionId);
        this.logger.debug(
          `Closed session ${runtime.sessionId} for cancelled task ${taskId}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to close session for cancelled task: ${error}`,
        );
      }
    }

    this.logger.log(`Task ${taskId} cancelled by user`);
    return {
      status: 'cancelled',
      creditsUsed: progress?.creditsUsed ?? task.creditsUsed ?? undefined,
    };
  }

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

  private generateTaskId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `at_${timestamp}_${random}`;
  }
}

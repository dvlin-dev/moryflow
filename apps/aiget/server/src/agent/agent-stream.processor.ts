/**
 * Agent Stream Processor
 *
 * [INPUT]: Agent 运行时流式事件
 * [OUTPUT]: SSE 格式的事件流
 * [POS]: 将 @aiget/agents-core 的流式事件转换为前端可消费的 SSE 事件
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import type { RunStreamEvent, StreamedRunResult } from '@aiget/agents-core';
import { AgentTaskProgressStore } from './agent-task.progress.store';
import {
  AgentBillingService,
  type BillingParams,
} from './agent-billing.service';
import type { AgentStreamEvent } from './dto';

const PROGRESS_UPDATE_INTERVAL_MS = 1000;

/** 任务取消错误 */
export class TaskCancelledError extends Error {
  constructor(message: string = 'Task cancelled by user') {
    super(message);
    this.name = 'TaskCancelledError';
  }
}

/** 流式处理参数 */
export interface StreamProcessorParams {
  streamResult: StreamedRunResult<any, any>;
  billing: BillingParams;
  taskId: string;
  userId: string;
  abortController: AbortController;
}

@Injectable()
export class AgentStreamProcessor {
  private readonly logger = new Logger(AgentStreamProcessor.name);

  constructor(
    private readonly progressStore: AgentTaskProgressStore,
    private readonly billingService: AgentBillingService,
  ) {}

  /**
   * 处理流式事件并进行计费/取消检查
   */
  async *consumeStreamEvents(
    params: StreamProcessorParams,
  ): AsyncGenerator<AgentStreamEvent, void, unknown> {
    const { streamResult, billing, taskId, abortController } = params;
    let lastProgressAt = 0;
    let lastCreditsUsed = billing.currentCredits;
    let lastToolCallCount = billing.toolCallCount;
    let lastCancelCheckAt = 0;

    for await (const event of streamResult) {
      if (abortController.signal.aborted) {
        throw new TaskCancelledError();
      }

      const now = Date.now();
      if (now - lastCancelCheckAt >= PROGRESS_UPDATE_INTERVAL_MS) {
        lastCancelCheckAt = now;
        let cancelled = false;
        try {
          cancelled = await this.progressStore.isCancelRequested(taskId);
        } catch (error) {
          this.logger.warn(
            `Failed to check cancel status for task ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        if (cancelled) {
          abortController.abort(new TaskCancelledError());
          throw new TaskCancelledError();
        }
      }

      if (event.type === 'run_item_stream_event') {
        const item = event.item;
        if (item.type === 'tool_call_item') {
          billing.toolCallCount++;
        }
      }

      this.billingService.updateBillingFromUsage(
        billing,
        streamResult.state?._context?.usage,
      );

      const progress = this.billingService.buildProgress(billing);
      const shouldUpdateProgress =
        progress.creditsUsed !== lastCreditsUsed ||
        progress.toolCallCount !== lastToolCallCount ||
        now - lastProgressAt >= PROGRESS_UPDATE_INTERVAL_MS;
      if (shouldUpdateProgress) {
        await this.safeProgressOperation(
          () => this.progressStore.setProgress(taskId, progress),
          'set progress',
        );
        lastProgressAt = now;
        lastCreditsUsed = progress.creditsUsed;
        lastToolCallCount = progress.toolCallCount;
      }

      try {
        this.billingService.checkCreditsLimit(billing);
      } catch (error) {
        abortController.abort(error);
        throw error;
      }

      try {
        await this.billingService.applyQuotaCheckpoint(
          params.userId,
          taskId,
          billing,
        );
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
  convertRunEventToSSE(event: RunStreamEvent): AgentStreamEvent | null {
    switch (event.type) {
      case 'raw_model_stream_event': {
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
        return {
          type: 'progress',
          message: `切换到: ${event.agent.name}`,
          step: 0,
        };
    }

    return null;
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
}

/**
 * Agent Stream Processor
 *
 * [INPUT]: Agent 运行时流式事件
 * [OUTPUT]: 透传 RunStreamEvent（含计费/取消/进度副作用）
 * [POS]: L3 流式副作用处理器：不做协议转换，只负责计费、配额检查、取消检查、进度落库
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import type { RunStreamEvent, StreamedRunResult } from '@openai/agents-core';
import { AgentTaskProgressStore } from './agent-task.progress.store';
import {
  AgentBillingService,
  type BillingParams,
} from './agent-billing.service';

const PROGRESS_UPDATE_INTERVAL_MS = 1000;

export class TaskCancelledError extends Error {
  constructor(message: string = 'Task cancelled by user') {
    super(message);
    this.name = 'TaskCancelledError';
  }
}

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

  async *consumeStreamEvents(
    params: StreamProcessorParams,
  ): AsyncGenerator<RunStreamEvent, void, unknown> {
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

      yield event;
    }
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

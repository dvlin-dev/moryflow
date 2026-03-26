import { randomUUID } from 'node:crypto';
import type { FinishReason, UIMessage, UIMessageChunk, UIMessageStreamWriter } from 'ai';
import type { RunToolApprovalItem } from '@openai/agents-core';
import {
  createRunModelStreamNormalizer,
  resolveToolCallIdFromRawItem,
} from '@moryflow/agents-runtime';
import type { TokenUsage } from '../../../shared/ipc.js';
import type { AgentStreamResult } from '../../agent-runtime/index.js';
import { isChatDebugEnabled } from '../../chat/debug/logger.js';
import { createChatStreamDebugLedger } from './debug-ledger.js';
import { createStreamCoordinator, type ToolRuntimeEventStream } from './coordinator.js';
import { emitUiMessageChunks } from './emitter.js';
import { ingestRunStreamEvent } from './ingestor.js';
import { createTurnStreamState, emitStreamStart } from './reducer.js';
import type { StreamThinkingContext } from './types.js';

export type StreamAgentRunResult = {
  finishReason?: FinishReason;
  usage?: TokenUsage;
};

const isRenderableAssistantChunk = (chunk: UIMessageChunk): boolean => {
  switch (chunk.type) {
    case 'reasoning-start':
    case 'reasoning-delta':
    case 'text-start':
    case 'text-delta':
    case 'tool-approval-request':
    case 'tool-input-available':
    case 'tool-output-available':
    case 'tool-output-error':
      return true;
    default:
      return false;
  }
};

export const streamAgentRun = async ({
  writer,
  result,
  toolNames,
  signal,
  onToolApprovalRequest,
  thinkingContext,
  onFirstRenderableAssistantChunk,
  toolRuntimeEvents,
}: {
  writer: UIMessageStreamWriter<UIMessage>;
  result: AgentStreamResult;
  toolNames?: string[];
  signal?: AbortSignal;
  onToolApprovalRequest?: (item: RunToolApprovalItem) => {
    approvalId: string;
    toolCallId: string;
  } | null;
  thinkingContext?: StreamThinkingContext;
  onFirstRenderableAssistantChunk?: (chunk: UIMessageChunk) => void;
  toolRuntimeEvents?: ToolRuntimeEventStream;
}): Promise<StreamAgentRunResult> => {
  const isAborted = () => signal?.aborted === true;
  const debugLedger = createChatStreamDebugLedger({ enabled: isChatDebugEnabled() });
  const normalizer = createRunModelStreamNormalizer();
  let firstRenderableAssistantChunkSeen = false;

  const state = createTurnStreamState({
    textMessageId: randomUUID(),
    reasoningMessageId: randomUUID(),
    thinkingContext,
  });

  const resolveToolCallId = (item: RunToolApprovalItem): string => {
    return resolveToolCallIdFromRawItem(item.rawItem, randomUUID);
  };

  const handleChunkEmitted = (chunk: UIMessageChunk) => {
    debugLedger.logChunkEmitted(chunk);
    if (firstRenderableAssistantChunkSeen || !isRenderableAssistantChunk(chunk)) {
      return;
    }
    firstRenderableAssistantChunkSeen = true;
    onFirstRenderableAssistantChunk?.(chunk);
  };

  const coordinator = createStreamCoordinator({
    writer,
    state,
    context: {
      toolNames,
      onToolApprovalRequest,
      randomUUID,
      resolveApprovalToolCallId: resolveToolCallId,
    },
    debugLedger,
    onChunkEmitted: handleChunkEmitted,
  });

  emitUiMessageChunks({
    writer,
    chunks: emitStreamStart(state).chunks,
    onChunkEmitted: handleChunkEmitted,
  });

  let eventIndex = 0;
  let streamError: unknown;
  const toolRuntimeTask = (async () => {
    if (!toolRuntimeEvents) {
      return;
    }
    try {
      for await (const runtimeEvent of toolRuntimeEvents) {
        if (isAborted()) {
          break;
        }
        await coordinator.processToolRuntimeEvent(runtimeEvent);
      }
    } catch (error) {
      console.error('[chat] toolRuntimeEvents error:', error);
      if (!isAbortError(error)) {
        throw error;
      }
    }
  })();

  try {
    try {
      for await (const event of result) {
        if (isAborted()) {
          break;
        }
        eventIndex += 1;
        debugLedger.logReceivedEvent(eventIndex, event);

        const canonicalEvents = ingestRunStreamEvent({
          event,
          eventIndex,
          normalizer,
        });

        for (const canonicalEvent of canonicalEvents) {
          debugLedger.logCanonicalEvent(canonicalEvent);
          await coordinator.processCanonicalEvent(canonicalEvent);
        }
      }
    } catch (error) {
      console.error('[chat] streamAgentRun error:', error);
      if (!isAbortError(error)) {
        streamError = error;
      }
    }
  } finally {
    toolRuntimeEvents?.close?.();
    try {
      await toolRuntimeTask;
    } catch (error) {
      if (!streamError) {
        streamError = error;
      }
    }
    if (streamError) {
      void result.completed.catch((error: unknown) => {
        console.error('[chat] result.completed error:', error);
      });
    } else {
      await result.completed.catch((error: unknown) => {
        console.error('[chat] result.completed error:', error);
        if (!isAbortError(error) && !streamError) {
          streamError = error;
        }
      });
    }
    await coordinator.finalize({
      aborted: isAborted(),
      failed: Boolean(streamError),
      finishReason: state.finishReason,
    });
  }

  if (streamError) {
    throw streamError;
  }

  debugLedger.logSummary(state, isAborted());

  const hasUsage = state.totalUsage.totalTokens > 0;
  return { finishReason: state.finishReason, usage: hasUsage ? state.totalUsage : undefined };
};

const isAbortError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
};

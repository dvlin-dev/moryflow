/**
 * [INPUT]: AgentStreamResult/RunStreamEvent + UIMessageStreamWriter + UIMessage[]
 * [OUTPUT]: UIMessageChunk 流转换/消息提取工具
 * [POS]: Chat 主进程流式消息转换与辅助函数（ingest -> reduce -> emit）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { randomUUID } from 'node:crypto';
import type {
  FinishReason,
  FileUIPart,
  UIMessage,
  UIMessageChunk,
  UIMessageStreamWriter,
} from 'ai';
import { isFileUIPart, isTextUIPart } from 'ai';
import type { RunToolApprovalItem } from '@openai/agents-core';
import {
  createRunModelStreamNormalizer,
  resolveToolCallIdFromRawItem,
} from '@moryflow/agents-runtime';

import type { TokenUsage } from '../../shared/ipc.js';
import type { AgentStreamResult } from '../agent-runtime/index.js';
import { isChatDebugEnabled } from '../chat-debug-log.js';
import { createChatStreamDebugLedger } from './stream/debug-ledger.js';
import { createStreamCoordinator, type ToolRuntimeEventStream } from './stream/coordinator.js';
import { emitUiMessageChunks } from './stream/emitter.js';
import { ingestRunStreamEvent } from './stream/ingestor.js';
import { createTurnStreamState, emitStreamStart } from './stream/reducer.js';
import type { StreamThinkingContext } from './stream/types.js';

export const findLatestUserMessage = (messages: UIMessage[]): UIMessage | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      return messages[index] ?? null;
    }
  }
  return null;
};

export const extractUserText = (message: UIMessage): string | null => {
  const textParts =
    message.parts
      ?.filter(isTextUIPart)
      .map((part) => part.text)
      .filter(Boolean) ?? [];
  if (textParts.length === 0) {
    return null;
  }
  return textParts.join('\n');
};

export const extractUserAttachments = (message: UIMessage): FileUIPart[] => {
  return message.parts?.filter(isFileUIPart) ?? [];
};

/** 流式处理结果 */
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

/**
 * 流式处理 Agent 运行结果
 * 将 /agents SDK 的流事件转换为 UI 消息流
 */
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
    await coordinator.finalize({
      aborted: isAborted(),
      finishReason: state.finishReason,
    });
  }

  if (streamError) {
    throw streamError;
  }

  // 等待流完成
  await result.completed.catch((error) => {
    console.error('[chat] result.completed error:', error);
    if (!isAbortError(error)) {
      throw error;
    }
  });

  debugLedger.logSummary(state, isAborted());

  // 返回结果（仅当有 token 使用时才包含 usage）
  const hasUsage = state.totalUsage.totalTokens > 0;
  return { finishReason: state.finishReason, usage: hasUsage ? state.totalUsage : undefined };
};

const isAbortError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
};

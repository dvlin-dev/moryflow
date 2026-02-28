/**
 * [INPUT]: AgentStreamResult/RunStreamEvent + UIMessageStreamWriter + UIMessage[]
 * [OUTPUT]: UIMessageChunk 流转换/消息提取工具
 * [POS]: Chat 主进程流式消息转换与辅助函数（ingest -> reduce -> emit）
 * [UPDATE]: 2026-02-28 - streamAgentRun 重构为状态机管道，收敛变量与顺序语义
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { randomUUID } from 'node:crypto';
import type { FinishReason, FileUIPart, UIMessage, UIMessageStreamWriter } from 'ai';
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
import { emitUiMessageChunks } from './stream/emitter.js';
import { ingestRunStreamEvent } from './stream/ingestor.js';
import {
  createTurnStreamState,
  emitStreamStart,
  finalizeTurnStream,
  reduceCanonicalChatEvent,
} from './stream/reducer.js';
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
}): Promise<StreamAgentRunResult> => {
  const isAborted = () => signal?.aborted === true;
  const debugLedger = createChatStreamDebugLedger({ enabled: isChatDebugEnabled() });
  const normalizer = createRunModelStreamNormalizer();

  const state = createTurnStreamState({
    textMessageId: randomUUID(),
    reasoningMessageId: randomUUID(),
    thinkingContext,
  });

  const resolveToolCallId = (item: RunToolApprovalItem): string => {
    return resolveToolCallIdFromRawItem(item.rawItem, randomUUID);
  };

  emitUiMessageChunks({
    writer,
    chunks: emitStreamStart(state).chunks,
    onChunkEmitted: debugLedger.logChunkEmitted,
  });

  let eventIndex = 0;
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
        const reduced = reduceCanonicalChatEvent({
          state,
          event: canonicalEvent,
          context: {
            toolNames,
            onToolApprovalRequest,
            randomUUID,
            resolveApprovalToolCallId: resolveToolCallId,
          },
        });
        emitUiMessageChunks({
          writer,
          chunks: reduced.chunks,
          onChunkEmitted: debugLedger.logChunkEmitted,
        });
        debugLedger.logStateSnapshot(eventIndex, state);
      }
    }
  } catch (error) {
    console.error('[chat] streamAgentRun error:', error);
    if (!isAbortError(error)) {
      throw error;
    }
  }

  emitUiMessageChunks({
    writer,
    chunks: finalizeTurnStream({
      state,
      aborted: isAborted(),
      finishReason: state.finishReason,
    }).chunks,
    onChunkEmitted: debugLedger.logChunkEmitted,
  });

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

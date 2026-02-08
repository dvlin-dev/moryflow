/**
 * [INPUT]: AgentStreamResult/RunStreamEvent + UIMessageStreamWriter + UIMessage[]
 * [OUTPUT]: UIMessageChunk 流转换/消息提取工具
 * [POS]: Chat 主进程流式消息转换与辅助函数
 * [UPDATE]: 2026-02-03 - 输出 start/finish chunk，移除 UIMessageStream 持久化逻辑
 * [UPDATE]: 2026-02-07 - 移除未处理事件类型调试日志，避免无用噪音
 * [UPDATE]: 2026-02-08 - streamAgentRun 避免重复写入 start chunk，防止空 assistant 消息
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { randomUUID } from 'node:crypto';
import type { FinishReason, UIMessage, UIMessageStreamWriter, FileUIPart } from 'ai';
import { isFileUIPart, isTextUIPart } from 'ai';
import {
  RunItemStreamEvent,
  RunRawModelStreamEvent,
  RunToolApprovalItem,
} from '@openai/agents-core';

import type { TokenUsage } from '../../shared/ipc.js';
import type { AgentStreamResult } from '../agent-runtime/index.js';
import { mapRunToolEventToChunk } from './tool-calls.js';

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
}: {
  writer: UIMessageStreamWriter<UIMessage>;
  result: AgentStreamResult;
  toolNames?: string[];
  signal?: AbortSignal;
  onToolApprovalRequest?: (item: RunToolApprovalItem) => {
    approvalId: string;
    toolCallId: string;
  } | null;
}): Promise<StreamAgentRunResult> => {
  // 避免持久化漏写：首次输出前注入 start chunk 以获得稳定 messageId
  let messageStarted = false;
  // 使用固定的消息 ID，整轮对话只用一个
  const textMessageId = randomUUID();
  const reasoningMessageId = randomUUID();
  // 跟踪当前文本段落状态（可以有多个 text-start/text-end 循环，但 ID 不变）
  let textSegmentStarted = false;
  let reasoningSegmentStarted = false;
  let finishReason: FinishReason | undefined;
  // 累积 token 使用量（一次请求可能触发多次 LLM 调用）
  const totalUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  const isAborted = () => signal?.aborted === true;

  const ensureMessageStarted = () => {
    if (messageStarted) return true;
    try {
      writer.write({ type: 'start' });
      messageStarted = true;
      return true;
    } catch (error) {
      console.error('[chat] failed to write message start', error);
      return false;
    }
  };

  const ensureReasoningStarted = () => {
    if (reasoningSegmentStarted) return true;
    if (!ensureMessageStarted()) return false;
    try {
      writer.write({ type: 'reasoning-start', id: reasoningMessageId });
      reasoningSegmentStarted = true;
      return true;
    } catch (error) {
      console.error('[chat] failed to write reasoning-start', error);
      return false;
    }
  };

  const emitReasoningDelta = (delta: string) => {
    if (!delta) return;
    if (!ensureReasoningStarted()) return;
    try {
      writer.write({ type: 'reasoning-delta', id: reasoningMessageId, delta });
    } catch (error) {
      console.warn('[chat] failed to write reasoning-delta', error);
    }
  };

  const emitReasoningEnd = () => {
    if (!reasoningSegmentStarted) return;
    reasoningSegmentStarted = false;
    try {
      writer.write({ type: 'reasoning-end', id: reasoningMessageId });
    } catch (error) {
      console.warn('[chat] failed to write reasoning-end', error);
    }
  };

  const ensureTextStarted = () => {
    if (textSegmentStarted) return true;
    // 在开始文本之前，结束 reasoning（如果有）
    if (reasoningSegmentStarted) {
      emitReasoningEnd();
    }
    if (!ensureMessageStarted()) return false;
    try {
      writer.write({ type: 'text-start', id: textMessageId });
      textSegmentStarted = true;
      return true;
    } catch (error) {
      console.error('[chat] failed to write text-start', error);
      return false;
    }
  };

  const emitTextDelta = (delta: string) => {
    if (!delta) return;
    if (!ensureTextStarted()) return;
    try {
      writer.write({ type: 'text-delta', id: textMessageId, delta });
    } catch (error) {
      console.warn('[chat] failed to write text-delta', error);
    }
  };

  const emitTextEnd = () => {
    if (!textSegmentStarted) return;
    textSegmentStarted = false; // 重置，允许后续开始新的文本段落
    try {
      writer.write({ type: 'text-end', id: textMessageId });
    } catch (error) {
      console.warn('[chat] failed to write text-end', error);
    }
  };

  const resolveToolCallId = (item: RunToolApprovalItem): string => {
    const raw = item.rawItem as Record<string, unknown> | undefined;
    const callId =
      typeof raw?.callId === 'string' && raw.callId.length > 0 ? raw.callId : undefined;
    const rawId = typeof raw?.id === 'string' && raw.id.length > 0 ? raw.id : undefined;
    const providerData = raw?.providerData as Record<string, unknown> | undefined;
    const providerId =
      typeof providerData?.id === 'string' && providerData.id.length > 0
        ? providerData.id
        : undefined;
    return callId ?? rawId ?? providerId ?? randomUUID();
  };

  try {
    ensureMessageStarted();

    for await (const event of result) {
      if (isAborted()) break;

      // 处理工具调用事件
      if (event instanceof RunItemStreamEvent) {
        if (event.name === 'tool_approval_requested' && event.item instanceof RunToolApprovalItem) {
          const approval = onToolApprovalRequest?.(event.item);
          if (!approval) {
            continue;
          }
          ensureMessageStarted();
          const toolCallId = approval.toolCallId ?? resolveToolCallId(event.item);
          const approvalId = approval.approvalId ?? randomUUID();
          try {
            writer.write({
              type: 'tool-approval-request',
              approvalId,
              toolCallId,
            });
          } catch (error) {
            console.warn('[chat] failed to write tool approval request', error);
          }
          continue;
        }
        const chunk = mapRunToolEventToChunk(event, toolNames);
        if (chunk) {
          ensureMessageStarted();
          try {
            writer.write(chunk);
          } catch (error) {
            console.warn('[chat] failed to write tool chunk', error);
          }
        }
        continue;
      }

      // 处理模型流事件
      if (event instanceof RunRawModelStreamEvent) {
        const extracted = extractStreamEvent(event.data);
        if (extracted.reasoningDelta) {
          emitReasoningDelta(extracted.reasoningDelta);
        }
        if (extracted.deltaText) {
          emitTextDelta(extracted.deltaText);
        }
        if (extracted.finishReason) {
          finishReason = extracted.finishReason;
        }
        if (extracted.usage) {
          totalUsage.promptTokens += extracted.usage.promptTokens;
          totalUsage.completionTokens += extracted.usage.completionTokens;
          totalUsage.totalTokens += extracted.usage.totalTokens;
        }
        if (extracted.isDone) {
          // 结束 reasoning（如果还在进行）
          emitReasoningEnd();
          emitTextEnd();
        }
      }
    }
  } catch (error) {
    console.error('[chat] streamAgentRun error:', error);
    if (!isAbortError(error)) {
      throw error;
    }
  }

  // 确保 reasoning 和文本流正确结束
  if (!isAborted()) {
    emitReasoningEnd();
    emitTextEnd();
    try {
      writer.write({ type: 'finish', finishReason });
    } catch (error) {
      console.warn('[chat] failed to write finish chunk', error);
    }
  } else {
    try {
      writer.write({ type: 'abort', reason: 'aborted' });
    } catch (error) {
      console.warn('[chat] failed to write abort chunk', error);
    }
  }

  // 等待流完成
  await result.completed.catch((error) => {
    console.error('[chat] result.completed error:', error);
    if (!isAbortError(error)) {
      throw error;
    }
  });

  // 返回结果（仅当有 token 使用时才包含 usage）
  const hasUsage = totalUsage.totalTokens > 0;
  return { finishReason, usage: hasUsage ? totalUsage : undefined };
};

/** 流事件提取结果 */
type StreamEventResult = {
  deltaText: string;
  reasoningDelta: string;
  isDone: boolean;
  finishReason?: FinishReason;
  usage?: TokenUsage;
};

const EMPTY_RESULT: StreamEventResult = { deltaText: '', reasoningDelta: '', isDone: false };

/**
 * 从 /agents-extensions aisdk 流事件中提取文本和 reasoning
 *
 * aisdk 会 yield 以下事件类型：
 * - { type: 'output_text_delta', delta: '...' } - 文本增量
 * - { type: 'response_done', response: {...} } - 响应完成
 * - { type: 'model', event: {...} } - 底层模型原始事件
 *   - event.type === 'reasoning-delta' - reasoning 增量
 *   - event.type === 'finish' - 完成事件
 */
const extractStreamEvent = (data: unknown): StreamEventResult => {
  if (!data || typeof data !== 'object') return EMPTY_RESULT;

  const record = data as Record<string, unknown>;
  const eventType = record.type as string | undefined;

  // 文本增量事件（主要来源）
  if (eventType === 'output_text_delta' && typeof record.delta === 'string') {
    return { deltaText: record.delta, reasoningDelta: '', isDone: false };
  }

  // 响应完成事件（包含 usage 信息）
  if (eventType === 'response_done') {
    const response = record.response as Record<string, unknown> | undefined;
    const rawUsage = response?.usage as Record<string, number> | undefined;
    const usage: TokenUsage | undefined = rawUsage
      ? {
          // 兼容驼峰和下划线两种命名
          promptTokens:
            rawUsage.inputTokens ?? rawUsage.input_tokens ?? rawUsage.prompt_tokens ?? 0,
          completionTokens:
            rawUsage.outputTokens ?? rawUsage.output_tokens ?? rawUsage.completion_tokens ?? 0,
          totalTokens: rawUsage.totalTokens ?? rawUsage.total_tokens ?? 0,
        }
      : undefined;
    return { deltaText: '', reasoningDelta: '', isDone: true, finishReason: 'stop', usage };
  }

  // 底层模型事件
  if (eventType === 'model') {
    const event = record.event as Record<string, unknown> | undefined;
    if (!event) return EMPTY_RESULT;

    // reasoning-delta 事件 - 思考过程增量
    if (event.type === 'reasoning-delta' && typeof event.delta === 'string') {
      return { deltaText: '', reasoningDelta: event.delta, isDone: false };
    }

    // finish 事件
    if (event.type === 'finish') {
      const reason = (event.finishReason as FinishReason | undefined) || 'stop';
      return { deltaText: '', reasoningDelta: '', isDone: true, finishReason: reason };
    }
  }

  return EMPTY_RESULT;
};

const isAbortError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
};

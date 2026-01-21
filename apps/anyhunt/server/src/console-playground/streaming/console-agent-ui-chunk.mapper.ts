/**
 * [INPUT]: AgentStreamEvent（Console Playground 代理层事件）
 * [OUTPUT]: UIMessageChunk[]（ai 标准 UI 流协议）
 * [POS]: 将 AgentStreamEvent 映射为 UIMessageChunk，并在 tool 边界进行文本分段
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md（若存在）与 apps/anyhunt/server/CLAUDE.md（若影响协议/对外行为）
 */

import { randomUUID } from 'node:crypto';
import type { UIMessageChunk } from 'ai';
import type { AgentEventProgress, AgentStreamEvent } from '../../agent/dto';

export type ConsoleAgentUiChunkMapperState = {
  textPartId: string;
  reasoningPartId: string;
  textSegmentStarted: boolean;
  reasoningStarted: boolean;
  hasOutputTextDelta: boolean;
};

export const createConsoleAgentUiChunkMapperState =
  (): ConsoleAgentUiChunkMapperState => ({
    textPartId: randomUUID(),
    reasoningPartId: randomUUID(),
    textSegmentStarted: false,
    reasoningStarted: false,
    hasOutputTextDelta: false,
  });

const rotateTextPartId = (state: ConsoleAgentUiChunkMapperState) => {
  state.textPartId = randomUUID();
};

const rotateReasoningPartId = (state: ConsoleAgentUiChunkMapperState) => {
  state.reasoningPartId = randomUUID();
};

const ensureTextStart = (
  state: ConsoleAgentUiChunkMapperState,
): UIMessageChunk[] => {
  if (state.textSegmentStarted) return [];
  const chunks: UIMessageChunk[] = [];
  if (state.reasoningStarted) {
    state.reasoningStarted = false;
    chunks.push({ type: 'reasoning-end', id: state.reasoningPartId });
    rotateReasoningPartId(state);
  }
  state.textSegmentStarted = true;
  chunks.push({ type: 'text-start', id: state.textPartId });
  return chunks;
};

const ensureTextEnd = (
  state: ConsoleAgentUiChunkMapperState,
): UIMessageChunk[] => {
  if (!state.textSegmentStarted) return [];
  state.textSegmentStarted = false;
  const chunk: UIMessageChunk = { type: 'text-end', id: state.textPartId };
  rotateTextPartId(state);
  return [chunk];
};

const ensureReasoningStart = (
  state: ConsoleAgentUiChunkMapperState,
): UIMessageChunk[] => {
  if (state.reasoningStarted) return [];
  const chunks: UIMessageChunk[] = [];
  if (state.textSegmentStarted) {
    state.textSegmentStarted = false;
    chunks.push({ type: 'text-end', id: state.textPartId });
    rotateTextPartId(state);
  }
  state.reasoningStarted = true;
  chunks.push({ type: 'reasoning-start', id: state.reasoningPartId });
  return chunks;
};

const ensureReasoningEnd = (
  state: ConsoleAgentUiChunkMapperState,
): UIMessageChunk[] => {
  if (!state.reasoningStarted) return [];
  state.reasoningStarted = false;
  const chunk: UIMessageChunk = {
    type: 'reasoning-end',
    id: state.reasoningPartId,
  };
  rotateReasoningPartId(state);
  return [chunk];
};

const ensureToolBoundary = (
  state: ConsoleAgentUiChunkMapperState,
): UIMessageChunk[] => {
  return [...ensureReasoningEnd(state), ...ensureTextEnd(state)];
};

const serializePayload = (data: unknown): string => {
  if (typeof data === 'string') return data;
  if (data === null || data === undefined) return '';
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    if (data instanceof Error) {
      return data.message;
    }
    return '[Unserializable payload]';
  }
};

const formatProgressMessage = (event: AgentEventProgress): string => {
  const message = event.message?.trim() ?? '';
  const step =
    event.step !== undefined
      ? `Step ${event.step}${event.totalSteps ? `/${event.totalSteps}` : ''}`
      : '';
  const segments = [message, step].filter(Boolean);
  if (segments.length === 0) return '';
  return `Progress: ${segments.join(' · ')}`;
};

const ensureTrailingLineBreak = (value: string): string =>
  value.endsWith('\n') ? value : `${value}\n`;

/**
 * 将 AgentStreamEvent 映射为 UIMessageChunk（不包含 started → start 的映射）
 *
 * 关键策略：
 * - 在 toolCall/toolResult 前先结束 text/reasoning 段落，确保“文本 → tool → 文本”按顺序渲染
 * - complete/failed 时确保段落结束，避免前端出现 streaming part 悬挂
 */
export const mapConsoleAgentEventToUiChunks = (
  event: AgentStreamEvent,
  state: ConsoleAgentUiChunkMapperState,
): UIMessageChunk[] => {
  switch (event.type) {
    case 'started':
      return [];
    case 'textDelta': {
      const delta = event.delta ?? '';
      if (!delta) return [];
      state.hasOutputTextDelta = true;
      return [
        ...ensureTextStart(state),
        { type: 'text-delta', id: state.textPartId, delta },
      ];
    }
    case 'reasoningDelta': {
      const delta = event.delta ?? '';
      if (!delta) return [];
      return [
        ...ensureReasoningStart(state),
        { type: 'reasoning-delta', id: state.reasoningPartId, delta },
      ];
    }
    case 'progress': {
      const progressText = formatProgressMessage(event);
      if (!progressText) return [];
      return [
        ...ensureTextStart(state),
        {
          type: 'text-delta',
          id: state.textPartId,
          delta: ensureTrailingLineBreak(progressText),
        },
      ];
    }
    case 'toolCall': {
      return [
        ...ensureToolBoundary(state),
        {
          type: 'tool-input-available',
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          input: event.input,
        },
      ];
    }
    case 'toolResult': {
      const boundary = ensureToolBoundary(state);
      if (event.errorText) {
        return [
          ...boundary,
          {
            type: 'tool-output-error',
            toolCallId: event.toolCallId,
            errorText: event.errorText,
          },
        ];
      }
      if (event.output !== undefined) {
        return [
          ...boundary,
          {
            type: 'tool-output-available',
            toolCallId: event.toolCallId,
            output: event.output,
          },
        ];
      }
      return boundary;
    }
    case 'complete': {
      const chunks: UIMessageChunk[] = [];
      chunks.push(...ensureReasoningEnd(state));

      if (!state.hasOutputTextDelta) {
        const payload = serializePayload(event.data);
        if (payload) {
          chunks.push(...ensureTextStart(state), {
            type: 'text-delta',
            id: state.textPartId,
            delta: payload,
          });
        }
      }

      chunks.push(...ensureTextEnd(state));
      return chunks;
    }
    case 'failed': {
      const chunks: UIMessageChunk[] = [
        ...ensureReasoningEnd(state),
        ...ensureTextStart(state),
      ];
      chunks.push({
        type: 'text-delta',
        id: state.textPartId,
        delta: `Error: ${event.error}`,
      });
      chunks.push(...ensureTextEnd(state));
      chunks.push({ type: 'error', errorText: event.error });
      return chunks;
    }
    default:
      return [];
  }
};

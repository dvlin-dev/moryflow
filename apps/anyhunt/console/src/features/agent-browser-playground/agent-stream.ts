/**
 * [PROVIDES]: Agent SSE event mapping helpers (text/tool)
 * [DEPENDS]: ai UI message types
 * [POS]: 将 AgentStreamEvent 转换为 UIMessageChunk（text/reasoning/tool/progress）
 */

import { isTextUIPart, type UIMessage, type UIMessageChunk } from 'ai';
import type { AgentStreamEvent, AgentEventProgress } from './types';

const createPartId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export type AgentEventMapperState = {
  messageId: string;
  textPartId: string;
  reasoningPartId: string;
  textSegmentStarted: boolean;
  reasoningStarted: boolean;
  hasOutputTextDelta: boolean;
};

export const createAgentEventState = (messageId: string): AgentEventMapperState => ({
  messageId,
  textPartId: createPartId(),
  reasoningPartId: createPartId(),
  textSegmentStarted: false,
  reasoningStarted: false,
  hasOutputTextDelta: false,
});

const ensureTextStart = (state: AgentEventMapperState): UIMessageChunk[] => {
  if (state.textSegmentStarted) return [];
  const chunks: UIMessageChunk[] = [];
  if (state.reasoningStarted) {
    state.reasoningStarted = false;
    chunks.push({ type: 'reasoning-end', id: state.reasoningPartId });
  }
  state.textSegmentStarted = true;
  chunks.push({ type: 'text-start', id: state.textPartId });
  return chunks;
};

const ensureTextEnd = (state: AgentEventMapperState): UIMessageChunk[] => {
  if (!state.textSegmentStarted) return [];
  state.textSegmentStarted = false;
  return [{ type: 'text-end', id: state.textPartId }];
};

const ensureReasoningStart = (state: AgentEventMapperState): UIMessageChunk[] => {
  if (state.reasoningStarted) return [];
  const chunks: UIMessageChunk[] = [];
  if (state.textSegmentStarted) {
    state.textSegmentStarted = false;
    chunks.push({ type: 'text-end', id: state.textPartId });
  }
  state.reasoningStarted = true;
  chunks.push({ type: 'reasoning-start', id: state.reasoningPartId });
  return chunks;
};

const ensureReasoningEnd = (state: AgentEventMapperState): UIMessageChunk[] => {
  if (!state.reasoningStarted) return [];
  state.reasoningStarted = false;
  return [{ type: 'reasoning-end', id: state.reasoningPartId }];
};

const serializePayload = (data: unknown): string => {
  if (typeof data === 'string') return data;
  if (data === null || data === undefined) return '';
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
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

export const mapAgentEventToChunks = (
  event: AgentStreamEvent,
  state: AgentEventMapperState
): UIMessageChunk[] => {
  switch (event.type) {
    case 'textDelta': {
      const delta = event.delta ?? '';
      if (!delta) return [];
      state.hasOutputTextDelta = true;
      return [...ensureTextStart(state), { type: 'text-delta', id: state.textPartId, delta }];
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
        {
          type: 'tool-input-available',
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          input: event.input,
        },
      ];
    }
    case 'toolResult': {
      if (event.errorText) {
        return [
          {
            type: 'tool-output-error',
            toolCallId: event.toolCallId,
            errorText: event.errorText,
          },
        ];
      }
      if (event.output !== undefined) {
        return [
          {
            type: 'tool-output-available',
            toolCallId: event.toolCallId,
            output: event.output,
          },
        ];
      }
      return [];
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
      const chunks: UIMessageChunk[] = [...ensureReasoningEnd(state), ...ensureTextStart(state)];
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

export const extractPromptFromMessages = (messages: UIMessage[]): string => {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user');
  if (!lastUser) return '';
  const textParts = lastUser.parts.filter(isTextUIPart);
  return textParts
    .map((part) => part.text)
    .join('\n')
    .trim();
};

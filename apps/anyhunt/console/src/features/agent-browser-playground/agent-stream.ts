/**
 * [PROVIDES]: Agent SSE event mapping helpers (text/tool/reasoning)
 * [DEPENDS]: ai UI message types
 * [POS]: 将 AgentStreamEvent 转换为 UIMessageChunk
 */

import { isTextUIPart, type UIMessage, type UIMessageChunk } from 'ai';
import type { AgentStreamEvent, AgentEventProgress } from './types';

export type AgentEventMapperState = {
  messageId: string;
  reasoningId: string;
  textStarted: boolean;
  textEnded: boolean;
  reasoningStarted: boolean;
  reasoningEnded: boolean;
};

export const createAgentEventState = (messageId: string): AgentEventMapperState => ({
  messageId,
  reasoningId: `${messageId}-reasoning`,
  textStarted: false,
  textEnded: false,
  reasoningStarted: false,
  reasoningEnded: false,
});

const ensureTextStart = (state: AgentEventMapperState): UIMessageChunk[] => {
  if (state.textStarted) return [];
  state.textStarted = true;
  return [{ type: 'text-start', id: state.messageId }];
};

const ensureTextEnd = (state: AgentEventMapperState): UIMessageChunk[] => {
  if (state.textEnded || !state.textStarted) return [];
  state.textEnded = true;
  return [{ type: 'text-end', id: state.messageId }];
};

const ensureReasoningStart = (state: AgentEventMapperState): UIMessageChunk[] => {
  if (state.reasoningStarted) return [];
  state.reasoningStarted = true;
  return [{ type: 'reasoning-start', id: state.reasoningId }];
};

const ensureReasoningEnd = (state: AgentEventMapperState): UIMessageChunk[] => {
  if (!state.reasoningStarted || state.reasoningEnded) return [];
  state.reasoningEnded = true;
  return [{ type: 'reasoning-end', id: state.reasoningId }];
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
    case 'thinking': {
      const content = event.content?.trim();
      if (!content) return [];
      return [
        ...ensureReasoningStart(state),
        {
          type: 'reasoning-delta',
          id: state.reasoningId,
          delta: content,
        },
      ];
    }
    case 'progress': {
      const progressText = formatProgressMessage(event);
      if (!progressText) return [];
      return [
        ...ensureReasoningStart(state),
        {
          type: 'reasoning-delta',
          id: state.reasoningId,
          delta: ensureTrailingLineBreak(progressText),
        },
      ];
    }
    case 'tool_call': {
      return [
        ...ensureTextStart(state),
        {
          type: 'tool-input-available',
          toolCallId: event.callId,
          toolName: event.tool,
          input: event.args,
        },
      ];
    }
    case 'tool_result': {
      const chunks: UIMessageChunk[] = [...ensureTextStart(state)];
      if (event.error) {
        chunks.push({
          type: 'tool-output-error',
          toolCallId: event.callId,
          errorText: event.error,
        });
        return chunks;
      }
      chunks.push({
        type: 'tool-output-available',
        toolCallId: event.callId,
        output: event.result,
      });
      return chunks;
    }
    case 'complete': {
      const payload = serializePayload(event.data);
      const chunks: UIMessageChunk[] = [...ensureReasoningEnd(state), ...ensureTextStart(state)];
      if (payload) {
        chunks.push({
          type: 'text-delta',
          id: state.messageId,
          delta: payload,
        });
      }
      return chunks.concat(ensureTextEnd(state));
    }
    case 'failed': {
      const chunks: UIMessageChunk[] = [...ensureReasoningEnd(state), ...ensureTextStart(state)];
      chunks.push({
        type: 'text-delta',
        id: state.messageId,
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

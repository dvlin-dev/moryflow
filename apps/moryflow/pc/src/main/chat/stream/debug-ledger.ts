/**
 * [PROVIDES]: 对话流全量调试日志记录器（事件/状态/chunk/summary）
 * [DEPENDS]: chat-debug-log
 * [POS]: 对话链路排障审计层，支持单轮回放
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { UIMessageChunk } from 'ai';

import { logChatDebug } from '../../chat-debug-log.js';
import { resolveReasoningVisibility } from './reducer.js';
import type { CanonicalChatEvent, TurnStreamState } from './types.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const truncateForLog = (value: string, maxLength = 200): string => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
};

const stringifyWithPreview = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return truncateForLog(value);
  }
  if (!value) {
    return null;
  }
  try {
    return truncateForLog(JSON.stringify(value));
  } catch {
    return '[Unserializable]';
  }
};

const summarizeChunk = (chunk: UIMessageChunk) => {
  const shared = {
    type: chunk.type,
    ...('toolCallId' in chunk && typeof chunk.toolCallId === 'string'
      ? { toolCallId: chunk.toolCallId }
      : {}),
    ...('toolName' in chunk && typeof chunk.toolName === 'string'
      ? { toolName: chunk.toolName }
      : {}),
    ...('approvalId' in chunk && typeof chunk.approvalId === 'string'
      ? { approvalId: chunk.approvalId }
      : {}),
  };

  if (chunk.type === 'text-delta' || chunk.type === 'reasoning-delta') {
    return {
      ...shared,
      id: chunk.id,
      deltaPreview: typeof chunk.delta === 'string' ? truncateForLog(chunk.delta) : null,
      deltaLength: typeof chunk.delta === 'string' ? chunk.delta.length : 0,
    };
  }
  if (chunk.type === 'tool-input-available') {
    return {
      ...shared,
      inputPreview: stringifyWithPreview(chunk.input),
    };
  }
  if (chunk.type === 'tool-output-available') {
    return {
      ...shared,
      outputPreview: stringifyWithPreview(chunk.output),
    };
  }
  if (chunk.type === 'tool-output-error') {
    return {
      ...shared,
      errorText: chunk.errorText,
    };
  }
  if (chunk.type === 'start' || chunk.type === 'finish' || chunk.type === 'abort') {
    return chunk;
  }
  return shared;
};

const summarizeReceivedEvent = (event: unknown) => {
  if (!isRecord(event)) {
    return { eventType: 'unknown' };
  }
  const eventType = typeof event.type === 'string' ? event.type : 'unknown';
  const eventName = typeof event.name === 'string' ? event.name : undefined;
  return {
    eventType,
    eventName,
  };
};

const summarizeCanonicalEvent = (event: CanonicalChatEvent) => {
  if (event.kind === 'run-item') {
    return {
      kind: event.kind,
      eventIndex: event.eventIndex,
      eventName: event.eventName,
      itemType: event.itemType,
    };
  }
  if (event.kind === 'raw-model') {
    return {
      kind: event.kind,
      eventIndex: event.eventIndex,
      rawEventType: event.rawEventType,
      canonicalKind: event.extracted.kind,
      canonicalSource: event.extracted.source,
      textDeltaLength: event.extracted.deltaText.length,
      reasoningDeltaLength: event.extracted.reasoningDelta.length,
      isDone: event.extracted.isDone,
    };
  }
  return {
    kind: event.kind,
    eventIndex: event.eventIndex,
  };
};

const summarizeStateSnapshot = (state: TurnStreamState) => ({
  messageStarted: state.messageStarted,
  textOpen: state.text.open,
  reasoningOpen: state.reasoning.open,
  hasTextDelta: state.hasTextDelta,
  hasReasoningDelta: state.hasReasoningDelta,
  canonicalTextDeltaCount: state.canonicalTextDeltaCount,
  canonicalReasoningDeltaCount: state.canonicalReasoningDeltaCount,
  canonicalDoneSeen: state.canonicalDoneSeen,
  textDeltaChunks: state.textDeltaChunks,
  toolChunks: state.toolChunks,
  approvalRequests: state.approvalRequests,
  usageTotalTokens: state.totalUsage.totalTokens,
});

export const createChatStreamDebugLedger = ({ enabled }: { enabled: boolean }) => {
  let chunkIndex = 0;

  const log = (stage: string, payload?: unknown) => {
    if (!enabled) {
      return;
    }
    logChatDebug(stage, payload);
  };

  const logReceivedEvent = (eventIndex: number, event: unknown) => {
    log('chat.stream.event.received', {
      eventIndex,
      ...summarizeReceivedEvent(event),
    });
  };

  const logCanonicalEvent = (event: CanonicalChatEvent) => {
    log('chat.stream.event.canonical', summarizeCanonicalEvent(event));
  };

  const logStateSnapshot = (eventIndex: number, state: TurnStreamState) => {
    log('chat.stream.state.snapshot', {
      eventIndex,
      state: summarizeStateSnapshot(state),
    });
  };

  const logChunkEmitted = (chunk: UIMessageChunk) => {
    chunkIndex += 1;
    log('chat.stream.chunk.emitted', {
      chunkIndex,
      chunk: summarizeChunk(chunk),
    });
  };

  const logSummary = (state: TurnStreamState, aborted: boolean) => {
    const reasoningVisibility = resolveReasoningVisibility(state);

    log('chat.stream.summary', {
      finishReason: state.finishReason ?? 'unknown',
      aborted,
      thinkingRequested: state.thinkingRequested,
      thinkingResolvedLevel: state.thinkingResolvedLevel,
      thinkingDowngradedToOff: state.thinkingDowngradedToOff,
      thinkingDowngradeReason: state.thinkingDowngradeReason ?? null,
      reasoningVisibility,
      hasReasoningDelta: state.hasReasoningDelta,
      hasTextDelta: state.hasTextDelta,
      canonicalTextDeltaCount: state.canonicalTextDeltaCount,
      canonicalReasoningDeltaCount: state.canonicalReasoningDeltaCount,
      canonicalDoneSeen: state.canonicalDoneSeen,
      reasoningSources: state.reasoningSources,
      rawEventTypeCounts: state.rawEventTypeCounts,
      ignoredRawEventTypeCounts: state.ignoredRawEventTypeCounts,
      runItemEventNameCounts: state.runItemEventNameCounts,
      textDeltaChunks: state.textDeltaChunks,
      toolChunks: state.toolChunks,
      approvalRequests: state.approvalRequests,
      usage: state.totalUsage,
    });
  };

  return {
    logReceivedEvent,
    logCanonicalEvent,
    logStateSnapshot,
    logChunkEmitted,
    logSummary,
  };
};

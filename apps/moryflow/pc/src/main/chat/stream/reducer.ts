/**
 * [PROVIDES]: CanonicalChatEvent 状态推进 + UIMessageChunk 生成（状态机）
 * [DEPENDS]: ai、@moryflow/agents-runtime（工具事件映射）
 * [POS]: 对话流核心状态机（ingest 后、emit 前）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { FinishReason, UIMessageChunk } from 'ai';
import { mapRunToolEventToChunk } from '@moryflow/agents-runtime';

import type {
  CanonicalChatEvent,
  StreamReduceContext,
  StreamReduceResult,
  StreamThinkingContext,
  TurnStreamState,
} from './types.js';

const incrementCounter = (counter: Record<string, number>, key: string) => {
  counter[key] = (counter[key] ?? 0) + 1;
};

const appendChunk = (chunks: UIMessageChunk[], chunk: UIMessageChunk) => {
  chunks.push(chunk);
};

const ensureMessageStarted = (state: TurnStreamState, chunks: UIMessageChunk[]) => {
  if (state.messageStarted) {
    return;
  }
  appendChunk(chunks, { type: 'start' });
  state.messageStarted = true;
};

const emitTextEnd = (state: TurnStreamState, chunks: UIMessageChunk[]) => {
  if (!state.text.open) {
    return;
  }
  appendChunk(chunks, { type: 'text-end', id: state.text.id });
  state.text.open = false;
};

const emitReasoningEnd = (state: TurnStreamState, chunks: UIMessageChunk[]) => {
  if (!state.reasoning.open) {
    return;
  }
  appendChunk(chunks, { type: 'reasoning-end', id: state.reasoning.id });
  state.reasoning.open = false;
};

const ensureTextStarted = (state: TurnStreamState, chunks: UIMessageChunk[]) => {
  if (state.text.open) {
    return;
  }
  emitReasoningEnd(state, chunks);
  ensureMessageStarted(state, chunks);
  appendChunk(chunks, { type: 'text-start', id: state.text.id });
  state.text.open = true;
};

const ensureReasoningStarted = (state: TurnStreamState, chunks: UIMessageChunk[]) => {
  if (state.reasoning.open) {
    return;
  }
  emitTextEnd(state, chunks);
  ensureMessageStarted(state, chunks);
  appendChunk(chunks, { type: 'reasoning-start', id: state.reasoning.id });
  state.reasoning.open = true;
};

const emitTextDelta = (
  state: TurnStreamState,
  chunks: UIMessageChunk[],
  delta: string
): boolean => {
  if (!delta) {
    return false;
  }
  ensureTextStarted(state, chunks);
  appendChunk(chunks, { type: 'text-delta', id: state.text.id, delta });
  state.hasTextDelta = true;
  state.textDeltaChunks += 1;
  return true;
};

const emitReasoningDelta = ({
  state,
  chunks,
  delta,
  source,
}: {
  state: TurnStreamState;
  chunks: UIMessageChunk[];
  delta: string;
  source: string;
}): boolean => {
  if (!delta) {
    return false;
  }
  ensureReasoningStarted(state, chunks);
  appendChunk(chunks, { type: 'reasoning-delta', id: state.reasoning.id, delta });
  state.hasReasoningDelta = true;
  incrementCounter(state.reasoningSources, source);
  return true;
};

const reduceRunItemEvent = ({
  state,
  chunks,
  event,
  context,
}: {
  state: TurnStreamState;
  chunks: UIMessageChunk[];
  event: Extract<CanonicalChatEvent, { kind: 'run-item' }>;
  context: StreamReduceContext;
}) => {
  incrementCounter(state.runItemEventNameCounts, event.eventName);

  if (event.eventName === 'tool_approval_requested') {
    state.approvalRequests += 1;
    const approvalItem = event.event.item as Parameters<
      NonNullable<StreamReduceContext['onToolApprovalRequest']>
    >[0];
    const approval = context.onToolApprovalRequest?.(approvalItem);
    if (!approval) {
      return;
    }
    ensureMessageStarted(state, chunks);
    appendChunk(chunks, {
      type: 'tool-approval-request',
      approvalId: approval.approvalId,
      toolCallId: approval.toolCallId ?? context.resolveApprovalToolCallId(approvalItem),
    });
    return;
  }

  const toolChunk = mapRunToolEventToChunk(event.event, context.toolNames, context.randomUUID);
  if (!toolChunk) {
    return;
  }
  ensureMessageStarted(state, chunks);
  appendChunk(chunks, toolChunk);
  state.toolChunks += 1;
};

const reduceRawModelEvent = ({
  state,
  chunks,
  event,
}: {
  state: TurnStreamState;
  chunks: UIMessageChunk[];
  event: Extract<CanonicalChatEvent, { kind: 'raw-model' }>;
}) => {
  incrementCounter(state.rawEventTypeCounts, event.rawEventType);
  const extracted = event.extracted;

  if (extracted.kind === 'reasoning-delta') {
    if (
      emitReasoningDelta({
        state,
        chunks,
        delta: extracted.reasoningDelta,
        source: `canonical:${extracted.source}`,
      })
    ) {
      state.canonicalReasoningDeltaCount += 1;
    }
  } else if (extracted.kind === 'text-delta') {
    if (emitTextDelta(state, chunks, extracted.deltaText)) {
      state.canonicalTextDeltaCount += 1;
    }
  } else if (extracted.kind === 'done') {
    state.canonicalDoneSeen = true;
    emitReasoningEnd(state, chunks);
    emitTextEnd(state, chunks);
  } else {
    incrementCounter(state.ignoredRawEventTypeCounts, event.rawEventType);
  }

  if (extracted.finishReason) {
    state.finishReason = extracted.finishReason;
  }

  if (extracted.usage) {
    state.totalUsage.promptTokens += extracted.usage.promptTokens;
    state.totalUsage.completionTokens += extracted.usage.completionTokens;
    state.totalUsage.totalTokens += extracted.usage.totalTokens;
  }

  if (extracted.isDone && extracted.kind !== 'done') {
    emitReasoningEnd(state, chunks);
    emitTextEnd(state, chunks);
  }
};

export const createTurnStreamState = ({
  textMessageId,
  reasoningMessageId,
  thinkingContext,
}: {
  textMessageId: string;
  reasoningMessageId: string;
  thinkingContext?: StreamThinkingContext;
}): TurnStreamState => ({
  messageStarted: false,
  text: { id: textMessageId, open: false },
  reasoning: { id: reasoningMessageId, open: false },
  hasReasoningDelta: false,
  hasTextDelta: false,
  canonicalTextDeltaCount: 0,
  canonicalReasoningDeltaCount: 0,
  canonicalDoneSeen: false,
  finishReason: undefined,
  totalUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  thinkingRequested: thinkingContext?.requested?.mode === 'level',
  thinkingResolvedLevel: thinkingContext?.resolvedLevel ?? 'off',
  thinkingDowngradedToOff: thinkingContext?.downgradedToOff ?? false,
  thinkingDowngradeReason: thinkingContext?.downgradeReason,
  reasoningSources: {},
  rawEventTypeCounts: {},
  ignoredRawEventTypeCounts: {},
  runItemEventNameCounts: {},
  textDeltaChunks: 0,
  toolChunks: 0,
  approvalRequests: 0,
});

export const emitStreamStart = (state: TurnStreamState): StreamReduceResult => {
  const chunks: UIMessageChunk[] = [];
  ensureMessageStarted(state, chunks);
  return { chunks };
};

export const reduceCanonicalChatEvent = ({
  state,
  event,
  context,
}: {
  state: TurnStreamState;
  event: CanonicalChatEvent;
  context: StreamReduceContext;
}): StreamReduceResult => {
  const chunks: UIMessageChunk[] = [];

  if (event.kind === 'run-item') {
    reduceRunItemEvent({ state, chunks, event, context });
    return { chunks };
  }

  if (event.kind === 'raw-model') {
    reduceRawModelEvent({ state, chunks, event });
    return { chunks };
  }

  return { chunks };
};

export const finalizeTurnStream = ({
  state,
  aborted,
  finishReason,
}: {
  state: TurnStreamState;
  aborted: boolean;
  finishReason?: FinishReason;
}): StreamReduceResult => {
  const chunks: UIMessageChunk[] = [];

  if (aborted) {
    appendChunk(chunks, { type: 'abort', reason: 'aborted' });
    return { chunks };
  }

  emitReasoningEnd(state, chunks);
  emitTextEnd(state, chunks);
  appendChunk(chunks, { type: 'finish', finishReason: finishReason ?? state.finishReason });
  return { chunks };
};

export const resolveReasoningVisibility = (
  state: TurnStreamState
): 'visible' | 'suppressed' | 'not-returned' => {
  if (state.hasReasoningDelta) {
    return 'visible';
  }
  if (!state.thinkingRequested) {
    return 'suppressed';
  }
  return state.thinkingDowngradedToOff ? 'suppressed' : 'not-returned';
};

/**
 * [PROVIDES]: Tool runtime 流式事件队列与 chat stream 协调器
 * [DEPENDS]: reducer/emitter/debug-ledger + agents-runtime tool streaming 协议
 * [POS]: Chat 主进程多源流统一编排层（SDK canonical event + 本地 tool runtime event）
 *
 * [PROTOCOL]: 仅在协调职责、事件协议或终态策略变化时更新 Header。
 */

import type { FinishReason, UIMessage, UIMessageChunk, UIMessageStreamWriter } from 'ai';
import {
  createToolStreamingPreviewReducer,
  type ToolRuntimeStreamEvent,
} from '@moryflow/agents-runtime';

import { createChatStreamDebugLedger } from './debug-ledger.js';
import { emitUiMessageChunks } from './emitter.js';
import { finalizeTurnStream, reduceCanonicalChatEvent } from './reducer.js';
import type {
  CanonicalChatEvent,
  StreamCanonicalToolRuntimeEvent,
  StreamReduceContext,
  TurnStreamState,
} from './types.js';

type DebugLedger = ReturnType<typeof createChatStreamDebugLedger>;

export type ToolRuntimeEventQueue = AsyncIterable<ToolRuntimeStreamEvent> & {
  push: (event: ToolRuntimeStreamEvent) => void;
  close: () => void;
};

type ToolRuntimeEventStream = AsyncIterable<ToolRuntimeStreamEvent> & {
  close?: () => void;
};

type StreamCoordinator = {
  processCanonicalEvent: (event: CanonicalChatEvent) => Promise<void>;
  processToolRuntimeEvent: (event: ToolRuntimeStreamEvent) => Promise<void>;
  finalize: (input: { aborted: boolean; finishReason?: FinishReason }) => Promise<void>;
};

const createIteratorResult = <T>(done: boolean, value?: T): IteratorResult<T> =>
  done ? { done: true, value: value as T } : { done: false, value: value as T };

export const createToolRuntimeEventQueue = (): ToolRuntimeEventQueue => {
  const pendingEvents: ToolRuntimeStreamEvent[] = [];
  let closed = false;
  let pendingResolve: ((result: IteratorResult<ToolRuntimeStreamEvent>) => void) | null = null;

  const flushPendingResolve = (result: IteratorResult<ToolRuntimeStreamEvent>) => {
    const resolve = pendingResolve;
    pendingResolve = null;
    resolve?.(result);
  };

  return {
    push(event) {
      if (closed) {
        return;
      }
      if (pendingResolve) {
        flushPendingResolve(createIteratorResult(false, event));
        return;
      }
      pendingEvents.push(event);
    },
    close() {
      if (closed) {
        return;
      }
      closed = true;
      flushPendingResolve(createIteratorResult(true));
    },
    [Symbol.asyncIterator]() {
      return {
        next: async () => {
          const nextEvent = pendingEvents.shift();
          if (nextEvent) {
            return createIteratorResult(false, nextEvent);
          }
          if (closed) {
            return createIteratorResult(true);
          }
          return new Promise<IteratorResult<ToolRuntimeStreamEvent>>((resolve) => {
            pendingResolve = resolve;
          });
        },
      };
    },
  };
};

const isToolFinalChunk = (
  chunk: UIMessageChunk
): chunk is Extract<UIMessageChunk, { type: 'tool-output-available' | 'tool-output-error' }> =>
  chunk.type === 'tool-output-available' || chunk.type === 'tool-output-error';

const isToolInputChunk = (
  chunk: UIMessageChunk
): chunk is Extract<UIMessageChunk, { type: 'tool-input-available' }> =>
  chunk.type === 'tool-input-available';

const isProgressRuntimeEvent = (
  event: ToolRuntimeStreamEvent
): event is Extract<ToolRuntimeStreamEvent, { kind: 'progress' }> => event.kind === 'progress';

const createToolRuntimeCanonicalEvent = (
  event: ToolRuntimeStreamEvent,
  sequence: number
): StreamCanonicalToolRuntimeEvent => ({
  kind: 'tool-runtime',
  sequence,
  event,
});

export const createStreamCoordinator = ({
  writer,
  state,
  context,
  debugLedger,
  onChunkEmitted,
}: {
  writer: UIMessageStreamWriter<UIMessage>;
  state: TurnStreamState;
  context: StreamReduceContext;
  debugLedger: DebugLedger;
  onChunkEmitted?: (chunk: UIMessageChunk) => void;
}): StreamCoordinator => {
  const previewReducer = createToolStreamingPreviewReducer();
  const knownToolCallIds = new Set<string>();
  const sdkFinalizedToolCallIds = new Set<string>();
  const closedToolRuntimeCallIds = new Set<string>();
  const activePreviewToolCallIds = new Set<string>();
  const pendingToolRuntimeEvents = new Map<string, ToolRuntimeStreamEvent[]>();
  const toolNamesByCallId = new Map<string, string>();
  let toolRuntimeSequence = 0;
  let chain = Promise.resolve();

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const next = chain.then(task, task);
    chain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  };

  const emitChunks = (chunks: UIMessageChunk[]) => {
    if (chunks.length === 0) {
      return;
    }
    emitUiMessageChunks({
      writer,
      chunks,
      onChunkEmitted,
    });
  };

  const trackToolInputChunk = (
    chunk: Extract<UIMessageChunk, { type: 'tool-input-available' }>
  ) => {
    knownToolCallIds.add(chunk.toolCallId);
    if (typeof chunk.toolName === 'string' && chunk.toolName.length > 0) {
      toolNamesByCallId.set(chunk.toolCallId, chunk.toolName);
    }
  };

  const emitToolInputChunk = (chunk: Extract<UIMessageChunk, { type: 'tool-input-available' }>) => {
    emitChunks([chunk]);
    state.toolChunks += 1;
    trackToolInputChunk(chunk);
  };

  const buildSyntheticToolInputChunk = (
    toolCallId: string
  ): Extract<UIMessageChunk, { type: 'tool-input-available' }> => {
    const toolName = toolNamesByCallId.get(toolCallId) ?? 'tool';
    const progressEvent = pendingToolRuntimeEvents
      .get(toolCallId)
      ?.find(
        (event): event is Extract<ToolRuntimeStreamEvent, { kind: 'progress' }> =>
          isProgressRuntimeEvent(event) &&
          typeof event.message === 'string' &&
          event.message.trim().length > 0
      );
    const progressSummary = progressEvent?.message;

    const input =
      toolName === 'bash' && progressSummary
        ? { command: progressSummary, summary: progressSummary }
        : progressSummary
          ? { summary: progressSummary }
          : null;

    return {
      type: 'tool-input-available',
      toolCallId,
      toolName,
      input,
      dynamic: Array.isArray(context.toolNames) ? !context.toolNames.includes(toolName) : undefined,
    };
  };

  const emitToolPreview = (event: ToolRuntimeStreamEvent) => {
    if (
      sdkFinalizedToolCallIds.has(event.toolCallId) ||
      closedToolRuntimeCallIds.has(event.toolCallId)
    ) {
      return;
    }

    const preview = previewReducer.consume(event);
    emitChunks([
      {
        type: 'tool-output-available',
        toolCallId: event.toolCallId,
        output: preview,
        preliminary: preview.status === 'running',
      },
    ]);
    state.toolChunks += 1;

    if (preview.status === 'running') {
      activePreviewToolCallIds.add(event.toolCallId);
      return;
    }

    activePreviewToolCallIds.delete(event.toolCallId);
    closedToolRuntimeCallIds.add(event.toolCallId);
    previewReducer.clear(event.toolCallId);
  };

  const clearToolPreviewState = (toolCallId: string) => {
    activePreviewToolCallIds.delete(toolCallId);
    pendingToolRuntimeEvents.delete(toolCallId);
    closedToolRuntimeCallIds.add(toolCallId);
    previewReducer.clear(toolCallId);
  };

  const flushPendingToolRuntimeEvents = (toolCallId: string) => {
    const pendingEvents = pendingToolRuntimeEvents.get(toolCallId);
    if (!pendingEvents || pendingEvents.length === 0) {
      return;
    }
    pendingToolRuntimeEvents.delete(toolCallId);
    for (const pendingEvent of pendingEvents) {
      if (sdkFinalizedToolCallIds.has(toolCallId) || closedToolRuntimeCallIds.has(toolCallId)) {
        break;
      }
      emitToolPreview(pendingEvent);
    }
  };

  const ensureToolInputAvailable = (toolCallId: string) => {
    if (knownToolCallIds.has(toolCallId)) {
      return;
    }

    // The AI SDK requires a tool invocation part before any tool output chunk.
    emitToolInputChunk(buildSyntheticToolInputChunk(toolCallId));
  };

  const trackSdkChunks = (chunks: UIMessageChunk[]) => {
    for (const chunk of chunks) {
      if (isToolInputChunk(chunk)) {
        trackToolInputChunk(chunk);
        flushPendingToolRuntimeEvents(chunk.toolCallId);
        continue;
      }

      if (!isToolFinalChunk(chunk)) {
        continue;
      }

      sdkFinalizedToolCallIds.add(chunk.toolCallId);
      clearToolPreviewState(chunk.toolCallId);
    }
  };

  const processCanonicalEvent = (event: CanonicalChatEvent) =>
    enqueue(async () => {
      const reduced = reduceCanonicalChatEvent({
        state,
        event,
        context,
      });
      emitChunks(reduced.chunks);
      trackSdkChunks(reduced.chunks);
      if ('eventIndex' in event && typeof event.eventIndex === 'number') {
        debugLedger.logStateSnapshot(event.eventIndex, state);
      }
    });

  const processToolRuntimeEvent = (event: ToolRuntimeStreamEvent) =>
    enqueue(async () => {
      toolRuntimeSequence += 1;
      debugLedger.logCanonicalEvent(createToolRuntimeCanonicalEvent(event, toolRuntimeSequence));

      if (
        sdkFinalizedToolCallIds.has(event.toolCallId) ||
        closedToolRuntimeCallIds.has(event.toolCallId)
      ) {
        return;
      }

      toolNamesByCallId.set(event.toolCallId, event.toolName);
      if (!knownToolCallIds.has(event.toolCallId)) {
        const pendingEvents = pendingToolRuntimeEvents.get(event.toolCallId) ?? [];
        pendingEvents.push(event);
        pendingToolRuntimeEvents.set(event.toolCallId, pendingEvents);
        return;
      }

      emitToolPreview(event);
      debugLedger.logStateSnapshot(toolRuntimeSequence, state);
    });

  const finalize = ({ aborted, finishReason }: { aborted: boolean; finishReason?: FinishReason }) =>
    enqueue(async () => {
      if (aborted) {
        const now = Date.now();
        const interruptedToolCallIds = Array.from(
          new Set([
            ...knownToolCallIds,
            ...pendingToolRuntimeEvents.keys(),
            ...activePreviewToolCallIds,
          ])
        ).filter(
          (toolCallId) =>
            !sdkFinalizedToolCallIds.has(toolCallId) && !closedToolRuntimeCallIds.has(toolCallId)
        );
        for (const toolCallId of interruptedToolCallIds) {
          ensureToolInputAvailable(toolCallId);
          flushPendingToolRuntimeEvents(toolCallId);
          if (sdkFinalizedToolCallIds.has(toolCallId) || closedToolRuntimeCallIds.has(toolCallId)) {
            continue;
          }
          emitToolPreview({
            kind: 'interrupted',
            toolCallId,
            toolName: toolNamesByCallId.get(toolCallId) ?? 'tool',
            reason: 'aborted',
            startedAt: now,
            timestamp: now,
          });
        }
      }

      emitChunks(
        finalizeTurnStream({
          state,
          aborted,
          finishReason,
        }).chunks
      );
    });

  return {
    processCanonicalEvent,
    processToolRuntimeEvent,
    finalize,
  };
};

export type { ToolRuntimeEventStream };

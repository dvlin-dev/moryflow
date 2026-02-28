/**
 * [PROVIDES]: RunStreamEvent -> UIMessageChunk 映射工具（tool/model），以及审批场景的 toolCallId 解析
 * [DEPENDS]: ai - UIMessageChunk/FinishReason 类型；运行时事件对象的结构约定
 * [POS]: 跨平台（PC/Mobile）共享的流式协议适配层，避免重复实现与语义漂移
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { FinishReason, UIMessageChunk } from 'ai';

type RunItemType =
  | 'tool_call_item'
  | 'tool_call_output_item'
  | 'tool_approval_item'
  | 'message_output_item'
  | 'reasoning_item'
  | 'handoff_call_item'
  | 'handoff_output_item';

type RunItemLike = {
  type?: RunItemType;
  rawItem?: unknown;
  output?: unknown;
};

type JsonLikeRecord = Record<string, unknown>;

export type RunItemStreamEventLike = {
  type?: string;
  name: string;
  item: unknown;
};

export type RunRawModelStreamEventLike = {
  type?: string;
  data: unknown;
};

export type UiStreamUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type CanonicalRawEventKind = 'none' | 'text-delta' | 'reasoning-delta' | 'done';
export type CanonicalRawEventSource =
  | 'unknown'
  | 'output_text_delta'
  | 'model_event_reasoning_delta'
  | 'response_done';

export type ExtractedRunModelStreamEvent = {
  kind: CanonicalRawEventKind;
  source: CanonicalRawEventSource;
  deltaText: string;
  reasoningDelta: string;
  isDone: boolean;
  finishReason?: FinishReason;
  usage?: UiStreamUsage;
};

export interface RunModelStreamNormalizer {
  consume: (data: unknown) => ExtractedRunModelStreamEvent;
}

const EMPTY_MODEL_EVENT: ExtractedRunModelStreamEvent = {
  kind: 'none',
  source: 'unknown',
  deltaText: '',
  reasoningDelta: '',
  isDone: false,
};

let idCounter = 0;

const createGeneratedId = (prefix: string): string => {
  const randomUUID =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : undefined;
  if (randomUUID) {
    return `${prefix}-${randomUUID}`;
  }
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
};

const isRecord = (value: unknown): value is JsonLikeRecord =>
  typeof value === 'object' && value !== null;

const getCtorName = (value: unknown): string | undefined =>
  isRecord(value) && typeof value.constructor?.name === 'string'
    ? value.constructor.name
    : undefined;

const getRunItemType = (item: unknown): RunItemType | undefined => {
  if (!isRecord(item)) {
    return undefined;
  }
  const typeFromProp = item.type;
  if (typeof typeFromProp === 'string') {
    return typeFromProp as RunItemType;
  }

  // 开发环境保留构造函数名兜底，避免跨包 class 实例判断带来的耦合。
  const ctorName = getCtorName(item);
  const ctorToType: Record<string, RunItemType> = {
    RunToolCallItem: 'tool_call_item',
    RunToolCallOutputItem: 'tool_call_output_item',
    RunToolApprovalItem: 'tool_approval_item',
    RunMessageOutputItem: 'message_output_item',
    RunReasoningItem: 'reasoning_item',
    RunHandoffCallItem: 'handoff_call_item',
    RunHandoffOutputItem: 'handoff_output_item',
  };
  return ctorName ? ctorToType[ctorName] : undefined;
};

const getRunItemRawItem = (item: unknown): JsonLikeRecord | undefined => {
  if (!isRecord(item)) {
    return undefined;
  }
  return isRecord(item.rawItem) ? item.rawItem : undefined;
};

const getRunItemOutput = (item: unknown): unknown => {
  if (!isRecord(item)) {
    return undefined;
  }
  return (item as RunItemLike).output;
};

const safeJsonParse = (value: string | null | undefined): unknown => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const parseUsage = (response: JsonLikeRecord | undefined): UiStreamUsage | undefined => {
  if (!response || !isRecord(response.usage)) {
    return undefined;
  }
  const usage = response.usage as JsonLikeRecord;
  const promptTokens =
    (typeof usage.inputTokens === 'number' ? usage.inputTokens : undefined) ??
    (typeof usage.input_tokens === 'number' ? usage.input_tokens : undefined) ??
    (typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : undefined) ??
    0;
  const completionTokens =
    (typeof usage.outputTokens === 'number' ? usage.outputTokens : undefined) ??
    (typeof usage.output_tokens === 'number' ? usage.output_tokens : undefined) ??
    (typeof usage.completion_tokens === 'number' ? usage.completion_tokens : undefined) ??
    0;
  const totalTokens =
    (typeof usage.totalTokens === 'number' ? usage.totalTokens : undefined) ??
    (typeof usage.total_tokens === 'number' ? usage.total_tokens : undefined) ??
    promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
};

type ToolCallInputInfo = {
  toolCallId: string;
  toolName: string;
  input: unknown;
  providerExecuted?: boolean;
};

type ToolCallOutputInfo = {
  toolCallId: string;
  toolName?: string;
  output?: unknown;
  errorText?: string;
  providerExecuted?: boolean;
};

const extractToolCallInput = (raw: JsonLikeRecord, createId?: () => string): ToolCallInputInfo => {
  const toolName =
    typeof raw.name === 'string'
      ? raw.name
      : typeof raw.toolName === 'string'
        ? raw.toolName
        : 'tool';

  const toolCallId =
    typeof raw.callId === 'string' && raw.callId.length > 0
      ? raw.callId
      : typeof raw.id === 'string' && raw.id.length > 0
        ? raw.id
        : (createId?.() ?? createGeneratedId('tool-call'));

  const argsSource = raw.arguments ?? raw.input;
  const input =
    typeof argsSource === 'string'
      ? (safeJsonParse(argsSource) ?? argsSource)
      : (argsSource ?? null);

  const providerExecuted =
    typeof raw.providerExecuted === 'boolean' ? raw.providerExecuted : undefined;

  return {
    toolCallId,
    toolName,
    input,
    providerExecuted,
  };
};

const extractToolCallOutput = (
  item: unknown,
  createId?: () => string
): ToolCallOutputInfo | null => {
  const raw = getRunItemRawItem(item);
  if (!raw) {
    return null;
  }

  const toolName =
    typeof raw.name === 'string'
      ? raw.name
      : typeof raw.toolName === 'string'
        ? raw.toolName
        : undefined;

  const toolCallId =
    typeof raw.callId === 'string' && raw.callId.length > 0
      ? raw.callId
      : typeof raw.id === 'string' && raw.id.length > 0
        ? raw.id
        : (createId?.() ?? createGeneratedId('tool-call'));

  const providerExecuted =
    typeof raw.providerExecuted === 'boolean' ? raw.providerExecuted : undefined;

  const rawOutput = getRunItemOutput(item) ?? raw.output;
  const output =
    typeof rawOutput === 'string' ? (safeJsonParse(rawOutput) ?? rawOutput) : (rawOutput ?? null);

  const errorText =
    typeof raw.errorText === 'string' && raw.errorText.length > 0 ? raw.errorText : undefined;

  return {
    toolCallId,
    toolName,
    output,
    errorText,
    providerExecuted,
  };
};

const extractModelEventReasoningDelta = (data: JsonLikeRecord): string => {
  if (data.type !== 'model') {
    return '';
  }
  if (!isRecord(data.event)) {
    return '';
  }

  const modelEvent = data.event;
  const modelEventType = modelEvent.type;
  if (modelEventType !== 'reasoning-delta' && modelEventType !== 'reasoning_delta') {
    return '';
  }

  if (typeof modelEvent.delta === 'string') {
    return modelEvent.delta;
  }
  if (typeof modelEvent.textDelta === 'string') {
    return modelEvent.textDelta;
  }
  return '';
};

export const isRunItemStreamEvent = (event: unknown): event is RunItemStreamEventLike => {
  if (!isRecord(event)) {
    return false;
  }
  if (event.type === 'run_item_stream_event') {
    return typeof event.name === 'string' && 'item' in event;
  }
  return getCtorName(event) === 'RunItemStreamEvent';
};

export const isRunRawModelStreamEvent = (event: unknown): event is RunRawModelStreamEventLike => {
  if (!isRecord(event)) {
    return false;
  }
  if (event.type === 'raw_model_stream_event') {
    return 'data' in event;
  }
  return getCtorName(event) === 'RunRawModelStreamEvent';
};

export const resolveToolCallIdFromRawItem = (rawItem: unknown, createId?: () => string): string => {
  const raw = isRecord(rawItem) ? rawItem : undefined;
  const providerData = isRecord(raw?.providerData) ? raw.providerData : undefined;

  const callId = typeof raw?.callId === 'string' && raw.callId.length > 0 ? raw.callId : undefined;
  const rawId = typeof raw?.id === 'string' && raw.id.length > 0 ? raw.id : undefined;
  const providerId =
    typeof providerData?.id === 'string' && providerData.id.length > 0
      ? providerData.id
      : undefined;

  return callId ?? rawId ?? providerId ?? createId?.() ?? createGeneratedId('tool-call');
};

export const mapRunToolEventToChunk = (
  event: RunItemStreamEventLike,
  knownToolNames?: string[],
  createId?: () => string
): UIMessageChunk | null => {
  const dynamicFlag = (toolName: string | undefined) =>
    typeof toolName === 'string' && knownToolNames ? !knownToolNames.includes(toolName) : undefined;

  const itemType = getRunItemType(event.item);
  const rawItem = getRunItemRawItem(event.item);

  if (event.name === 'tool_called' && itemType === 'tool_call_item' && rawItem) {
    const info = extractToolCallInput(rawItem, createId);
    return {
      type: 'tool-input-available',
      toolCallId: info.toolCallId,
      toolName: info.toolName,
      input: info.input,
      providerExecuted: info.providerExecuted,
      dynamic: dynamicFlag(info.toolName),
    };
  }

  if (event.name === 'tool_output' && itemType === 'tool_call_output_item') {
    const info = extractToolCallOutput(event.item, createId);
    if (!info) {
      return null;
    }
    return {
      type: info.errorText ? 'tool-output-error' : 'tool-output-available',
      toolCallId: info.toolCallId,
      output: info.output,
      errorText: info.errorText,
      providerExecuted: info.providerExecuted,
      dynamic: dynamicFlag(info.toolName),
    } as UIMessageChunk;
  }

  return null;
};

export const extractRunRawModelStreamEvent = (data: unknown): ExtractedRunModelStreamEvent => {
  if (!isRecord(data)) {
    return EMPTY_MODEL_EVENT;
  }

  const eventType = data.type;
  if (eventType === 'output_text_delta' && typeof data.delta === 'string') {
    return {
      kind: 'text-delta',
      source: 'output_text_delta',
      deltaText: data.delta,
      reasoningDelta: '',
      isDone: false,
    };
  }

  const modelReasoningDelta = extractModelEventReasoningDelta(data);
  if (modelReasoningDelta) {
    return {
      kind: 'reasoning-delta',
      source: 'model_event_reasoning_delta',
      deltaText: '',
      reasoningDelta: modelReasoningDelta,
      isDone: false,
    };
  }

  if (eventType === 'response_done') {
    const response = isRecord(data.response) ? data.response : undefined;
    return {
      kind: 'done',
      source: 'response_done',
      deltaText: '',
      reasoningDelta: '',
      isDone: true,
      finishReason: 'stop',
      usage: parseUsage(response),
    };
  }

  return EMPTY_MODEL_EVENT;
};

/**
 * 在协议边界统一规范化 raw model 事件：
 * - text: output_text_delta
 * - reasoning: model.event.reasoning-delta
 * - done: response_done
 * 其他事件仅用于日志观测，不驱动 UI。
 */
export const createRunModelStreamNormalizer = (): RunModelStreamNormalizer => ({
  consume: extractRunRawModelStreamEvent,
});

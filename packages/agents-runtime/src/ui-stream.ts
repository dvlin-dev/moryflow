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

export type ExtractedRunModelStreamEvent = {
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

const extractTextList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (isRecord(entry) && typeof entry.text === 'string' ? entry.text.trim() : ''))
    .filter((text) => text.length > 0);
};

const appendUniqueText = (target: string[], values: string[]) => {
  for (const value of values) {
    if (!value) {
      continue;
    }
    if (target.includes(value)) {
      continue;
    }
    target.push(value);
  }
};

const extractReasoningFromProviderData = (response: JsonLikeRecord): string[] => {
  const providerData = isRecord(response.providerData) ? response.providerData : undefined;
  const openrouter = isRecord(providerData?.openrouter) ? providerData.openrouter : undefined;
  const details = Array.isArray(openrouter?.reasoning_details) ? openrouter.reasoning_details : [];
  const chunks: string[] = [];

  for (const detail of details) {
    if (!isRecord(detail) || typeof detail.type !== 'string') {
      continue;
    }
    if (detail.type === 'reasoning.text' && typeof detail.text === 'string') {
      appendUniqueText(chunks, [detail.text.trim()]);
      continue;
    }
    if (detail.type === 'reasoning.summary' && typeof detail.summary === 'string') {
      appendUniqueText(chunks, [detail.summary.trim()]);
    }
  }

  return chunks;
};

const extractReasoningFromResponseDone = (response: JsonLikeRecord | undefined): string => {
  if (!response) {
    return '';
  }

  const chunks: string[] = [];
  const directReasoning = typeof response.reasoning === 'string' ? response.reasoning.trim() : '';
  if (directReasoning.length > 0) {
    appendUniqueText(chunks, [directReasoning]);
  }
  appendUniqueText(chunks, extractReasoningFromProviderData(response));

  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    if (!isRecord(item)) {
      continue;
    }
    if (item.type === 'reasoning') {
      appendUniqueText(chunks, extractTextList(item.rawContent));
      appendUniqueText(chunks, extractTextList(item.content));
      if (typeof item.text === 'string' && item.text.trim().length > 0) {
        appendUniqueText(chunks, [item.text.trim()]);
      }
    }
  }

  return chunks.join('\n').trim();
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
    return { deltaText: data.delta, reasoningDelta: '', isDone: false };
  }
  if (
    (eventType === 'text-delta' || eventType === 'text_delta') &&
    (typeof data.delta === 'string' || typeof data.textDelta === 'string')
  ) {
    const deltaText =
      typeof data.delta === 'string'
        ? data.delta
        : typeof data.textDelta === 'string'
          ? data.textDelta
          : '';
    return {
      deltaText,
      reasoningDelta: '',
      isDone: false,
    };
  }
  if (
    (eventType === 'reasoning-delta' || eventType === 'reasoning_delta') &&
    (typeof data.delta === 'string' || typeof data.textDelta === 'string')
  ) {
    const reasoningDelta =
      typeof data.delta === 'string'
        ? data.delta
        : typeof data.textDelta === 'string'
          ? data.textDelta
          : '';
    return {
      deltaText: '',
      reasoningDelta,
      isDone: false,
    };
  }
  if (eventType === 'response.output_text.delta' && typeof data.delta === 'string') {
    return { deltaText: data.delta, reasoningDelta: '', isDone: false };
  }
  if (
    (eventType === 'response.reasoning.delta' || eventType === 'response.reasoning_text.delta') &&
    typeof data.delta === 'string'
  ) {
    return { deltaText: '', reasoningDelta: data.delta, isDone: false };
  }
  if (eventType === 'finish') {
    const finishReason =
      typeof data.finishReason === 'string' ? (data.finishReason as FinishReason) : 'stop';
    return { deltaText: '', reasoningDelta: '', isDone: true, finishReason };
  }

  if (eventType === 'response_done') {
    const response = isRecord(data.response) ? data.response : undefined;
    const reasoningDelta = extractReasoningFromResponseDone(response);
    return {
      deltaText: '',
      reasoningDelta,
      isDone: true,
      finishReason: 'stop',
      usage: parseUsage(response),
    };
  }

  if (eventType === 'model' && isRecord(data.event)) {
    const modelEvent = data.event;
    if (
      (modelEvent.type === 'text-delta' || modelEvent.type === 'text_delta') &&
      (typeof modelEvent.delta === 'string' || typeof modelEvent.textDelta === 'string')
    ) {
      const deltaText =
        typeof modelEvent.delta === 'string'
          ? modelEvent.delta
          : typeof modelEvent.textDelta === 'string'
            ? modelEvent.textDelta
            : '';
      return {
        deltaText,
        reasoningDelta: '',
        isDone: false,
      };
    }
    if (modelEvent.type === 'reasoning-delta' && typeof modelEvent.delta === 'string') {
      return { deltaText: '', reasoningDelta: modelEvent.delta, isDone: false };
    }
    if (modelEvent.type === 'finish') {
      const finishReason =
        typeof modelEvent.finishReason === 'string'
          ? (modelEvent.finishReason as FinishReason)
          : 'stop';
      return { deltaText: '', reasoningDelta: '', isDone: true, finishReason };
    }
  }

  return EMPTY_MODEL_EVENT;
};

/**
 * 在协议边界统一规范化 raw model 事件，避免同一文本/思考增量通过双通道重复消费。
 * 决策：文本/思考只消费顶层通道，永久忽略 model.event.text-delta/reasoning-delta。
 * 这样可消除顺序敏感去重（model-first 与 top-level-first 都不会双写）。
 */
export const createRunModelStreamNormalizer = (): RunModelStreamNormalizer => {
  return {
    consume: (data: unknown): ExtractedRunModelStreamEvent => {
      if (!isRecord(data)) {
        return EMPTY_MODEL_EVENT;
      }

      const eventType = data.type;

      if (eventType === 'model' && isRecord(data.event)) {
        const modelEventType = data.event.type;
        if (
          modelEventType === 'text-delta' ||
          modelEventType === 'text_delta' ||
          modelEventType === 'reasoning-delta' ||
          modelEventType === 'reasoning_delta'
        ) {
          return EMPTY_MODEL_EVENT;
        }
      }

      return extractRunRawModelStreamEvent(data);
    },
  };
};

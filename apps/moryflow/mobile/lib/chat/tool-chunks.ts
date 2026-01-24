/**
 * Tool 事件转换模块
 *
 * 将 Agent Runtime 的 RunItemStreamEvent 转换为 UIMessageChunk
 * 参考 PC 端 apps/moryflow/pc/src/main/chat/tool-calls.ts
 */

import type { RunItemStreamEvent } from '@openai/agents-core';
import type { UIMessageChunk } from 'ai';
import { generateUUID } from '@/lib/utils/uuid';

// ============ 类型定义 ============

interface ToolCallInputInfo {
  toolCallId: string;
  toolName: string;
  input: unknown;
  providerExecuted?: boolean;
}

interface ToolCallOutputInfo {
  toolCallId: string;
  toolName?: string;
  output?: unknown;
  errorText?: string;
  providerExecuted?: boolean;
}

/** RunItem 的类型（使用属性检查而不是 instanceof） */
type RunItemType =
  | 'tool_call_item'
  | 'tool_call_output_item'
  | 'tool_approval_item'
  | 'message_output_item'
  | 'reasoning_item'
  | 'handoff_call_item'
  | 'handoff_output_item';

interface RunItemLike {
  type?: RunItemType;
  rawItem?: unknown;
  output?: unknown;
}

// ============ 工具函数 ============

function safeJsonParse(value: string | null | undefined): unknown {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * 获取 RunItem 类型
 *
 * 优先使用 type 属性，constructor.name 仅作为 fallback
 * 注意：代码压缩后 constructor.name 可能被混淆，应确保 SDK 设置 type 属性
 */
function getItemType(item: unknown): RunItemType | undefined {
  if (!item || typeof item !== 'object') return undefined;

  // 优先使用 type 属性（推荐方式）
  const typeFromProp = (item as RunItemLike).type;
  if (typeFromProp) return typeFromProp;

  // Fallback: 根据构造函数名推断（开发环境有效，生产环境可能失效）
  if (__DEV__) {
    const ctorName = (item as object).constructor?.name;
    const ctorToType: Record<string, RunItemType> = {
      RunToolCallItem: 'tool_call_item',
      RunToolCallOutputItem: 'tool_call_output_item',
      RunToolApprovalItem: 'tool_approval_item',
      RunMessageOutputItem: 'message_output_item',
      RunReasoningItem: 'reasoning_item',
      RunHandoffCallItem: 'handoff_call_item',
      RunHandoffOutputItem: 'handoff_output_item',
    };
    return ctorToType[ctorName ?? ''];
  }

  return undefined;
}

function getItemRawItem(item: unknown): unknown {
  if (!item || typeof item !== 'object') return undefined;
  return (item as RunItemLike).rawItem;
}

function getItemOutput(item: unknown): unknown {
  if (!item || typeof item !== 'object') return undefined;
  return (item as RunItemLike).output;
}

// ============ 提取函数 ============

function extractToolCallInput(raw: unknown): ToolCallInputInfo | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;

  const toolName =
    typeof record.name === 'string'
      ? record.name
      : typeof record.toolName === 'string'
        ? record.toolName
        : 'tool';

  const toolCallId =
    typeof record.callId === 'string' && record.callId.length > 0
      ? record.callId
      : typeof record.id === 'string' && record.id.length > 0
        ? record.id
        : generateUUID();

  const argsSource = record.arguments ?? record.input;
  const input =
    typeof argsSource === 'string'
      ? (safeJsonParse(argsSource) ?? argsSource)
      : (argsSource ?? null);

  const providerExecuted =
    typeof record.providerExecuted === 'boolean' ? record.providerExecuted : undefined;

  return { toolCallId, toolName, input, providerExecuted };
}

function extractToolCallOutput(item: unknown): ToolCallOutputInfo | null {
  const raw = getItemRawItem(item);
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;

  const toolName =
    typeof record.name === 'string'
      ? record.name
      : typeof record.toolName === 'string'
        ? record.toolName
        : undefined;

  const toolCallId =
    typeof record.callId === 'string' && record.callId.length > 0
      ? record.callId
      : typeof record.id === 'string' && record.id.length > 0
        ? record.id
        : generateUUID();

  const providerExecuted =
    typeof record.providerExecuted === 'boolean' ? record.providerExecuted : undefined;

  const rawOutput = getItemOutput(item) ?? record.output;
  const output =
    typeof rawOutput === 'string' ? (safeJsonParse(rawOutput) ?? rawOutput) : (rawOutput ?? null);

  const errorText =
    typeof record.errorText === 'string' && record.errorText.length > 0
      ? record.errorText
      : undefined;

  return { toolCallId, toolName, output, errorText, providerExecuted };
}

// ============ 主转换函数 ============

/**
 * 将 RunItemStreamEvent 转换为 UIMessageChunk
 *
 * 使用 type 属性检查而不是 instanceof（跨包 instanceof 可能不工作）
 */
export function mapRunToolEventToChunk(
  event: RunItemStreamEvent,
  knownToolNames?: string[]
): UIMessageChunk | null {
  const dynamicFlag = (toolName: string | undefined) =>
    typeof toolName === 'string' && knownToolNames ? !knownToolNames.includes(toolName) : undefined;

  const itemType = getItemType(event.item);
  const rawItem = getItemRawItem(event.item);

  // Tool 调用开始
  if (event.name === 'tool_called' && itemType === 'tool_call_item') {
    const info = extractToolCallInput(rawItem);
    if (!info) {
      return null;
    }
    return {
      type: 'tool-input-available',
      toolCallId: info.toolCallId,
      toolName: info.toolName,
      input: info.input,
      providerExecuted: info.providerExecuted,
      dynamic: dynamicFlag(info.toolName),
    };
  }

  // Tool 输出
  if (event.name === 'tool_output' && itemType === 'tool_call_output_item') {
    const info = extractToolCallOutput(event.item);
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

  // Tool 审批请求
  if (event.name === 'tool_approval_requested' && itemType === 'tool_approval_item') {
    const raw = (rawItem ?? {}) as Record<string, unknown>;
    const callId =
      typeof raw.callId === 'string'
        ? raw.callId
        : typeof raw.id === 'string'
          ? raw.id
          : generateUUID();
    const providerExecuted =
      typeof raw.providerExecuted === 'boolean' ? raw.providerExecuted : undefined;

    return {
      type: 'tool-input-available',
      toolCallId: callId,
      toolName: 'await_human_confirmation',
      input: raw.input ?? null,
      providerExecuted,
      dynamic: true,
    };
  }

  return null;
}

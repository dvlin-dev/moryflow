/**
 * [PROVIDES]: Tool 可见性策略常量与纯函数（状态分组、自动折叠判定）
 * [DEPENDS]: ai.ToolUIPart state 协议
 * [POS]: UIMessage 层 Tool/Reasoning 开合共享事实源
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { ToolUIPart } from 'ai';
import { isToolStreamingPreviewOutput } from '../tool-stream';

export type ToolVisibilityState =
  | ToolUIPart['state']
  | 'output-interrupted'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-denied';

export const TOOL_IN_PROGRESS_STATES = [
  'input-streaming',
  'input-available',
  'approval-requested',
  'approval-responded',
] as const;

export const TOOL_FINISHED_STATES = [
  'output-available',
  'output-error',
  'output-denied',
  'output-interrupted',
] as const;

const TOOL_IN_PROGRESS_STATE_SET = new Set<string>(TOOL_IN_PROGRESS_STATES);
const TOOL_FINISHED_STATE_SET = new Set<string>(TOOL_FINISHED_STATES);

export function isToolInProgressState(
  state: string | null | undefined
): state is ToolVisibilityState {
  return typeof state === 'string' && TOOL_IN_PROGRESS_STATE_SET.has(state);
}

export function isToolFinishedState(
  state: string | null | undefined
): state is ToolVisibilityState {
  return typeof state === 'string' && TOOL_FINISHED_STATE_SET.has(state);
}

export function resolveToolPartState(part: {
  state: string | null | undefined;
  preliminary?: boolean;
  output?: unknown;
}): ToolVisibilityState | undefined {
  if (part.state === 'output-available' && part.preliminary === true) {
    return 'input-available';
  }

  if (
    part.state === 'output-available' &&
    isToolStreamingPreviewOutput(part.output) &&
    part.output.status === 'interrupted'
  ) {
    return 'output-interrupted';
  }

  return typeof part.state === 'string' ? (part.state as ToolVisibilityState) : undefined;
}

export function isToolPartStreaming(part: {
  state: string | null | undefined;
  preliminary?: boolean;
  output?: unknown;
}): boolean {
  return isToolInProgressState(resolveToolPartState(part));
}

export function shouldAutoCollapse(
  prevState: string | null | undefined,
  nextState: string | null | undefined
): boolean {
  return isToolInProgressState(prevState) && isToolFinishedState(nextState);
}

export function resolveToolOpenState({
  state,
  hasManualExpanded,
}: {
  state: string | null | undefined;
  hasManualExpanded: boolean;
}): boolean {
  if (hasManualExpanded) {
    return true;
  }

  return isToolInProgressState(state);
}

export function resolveReasoningOpenState({
  isStreaming,
  hasManualExpanded,
}: {
  isStreaming: boolean;
  hasManualExpanded: boolean;
}): boolean {
  if (hasManualExpanded) {
    return true;
  }

  return isStreaming;
}

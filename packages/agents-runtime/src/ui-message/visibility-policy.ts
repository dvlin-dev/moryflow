/**
 * [PROVIDES]: Tool 可见性策略常量与纯函数（状态分组、自动折叠判定）
 * [DEPENDS]: ai.ToolUIPart state 协议
 * [POS]: UIMessage 层 Tool/Reasoning 开合共享事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { ToolUIPart } from 'ai';

export type ToolVisibilityState =
  | ToolUIPart['state']
  | 'approval-requested'
  | 'approval-responded'
  | 'output-denied';

export const AUTO_COLLAPSE_DELAY_MS = 1000;

export const TOOL_IN_PROGRESS_STATES = [
  'input-streaming',
  'input-available',
  'approval-requested',
  'approval-responded',
] as const;

export const TOOL_FINISHED_STATES = ['output-available', 'output-error', 'output-denied'] as const;

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

export function shouldAutoCollapse(
  prevState: string | null | undefined,
  nextState: string | null | undefined
): boolean {
  return isToolInProgressState(prevState) && isToolFinishedState(nextState);
}

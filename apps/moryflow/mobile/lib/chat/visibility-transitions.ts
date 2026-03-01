/**
 * [PROVIDES]: Tool/Reasoning 可见性状态迁移纯函数
 * [DEPENDS]: @moryflow/agents-runtime/ui-message/visibility-policy
 * [POS]: Mobile 聊天消息开合行为（可测试逻辑层）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  isToolInProgressState,
  shouldAutoCollapse,
  type ToolVisibilityState,
} from '@moryflow/agents-runtime/ui-message/visibility-policy';

export type ToolVisibilityAction = 'none' | 'expand' | 'collapse';
export type ReasoningVisibilityAction = 'none' | 'expand' | 'collapse-delayed';

export function resolveInitialToolOpen({
  defaultOpen,
  state,
}: {
  defaultOpen?: boolean;
  state: string | null | undefined;
}): boolean {
  if (defaultOpen) {
    return true;
  }
  return isToolInProgressState(state);
}

export function resolveToolVisibilityAction({
  previousState,
  nextState,
  hasManualExpanded,
}: {
  previousState: string | null | undefined;
  nextState: string | null | undefined;
  hasManualExpanded: boolean;
}): ToolVisibilityAction {
  if (isToolInProgressState(nextState)) {
    return 'expand';
  }
  if (shouldAutoCollapse(previousState, nextState) && !hasManualExpanded) {
    return 'collapse';
  }
  return 'none';
}

export function resolveInitialReasoningOpen({
  defaultOpen,
  isStreaming,
}: {
  defaultOpen?: boolean;
  isStreaming: boolean;
}): boolean {
  if (typeof defaultOpen === 'boolean') {
    return defaultOpen;
  }
  return isStreaming;
}

export function resolveReasoningVisibilityAction({
  wasStreaming,
  isStreaming,
  isOpen,
  hasManualExpanded,
}: {
  wasStreaming: boolean;
  isStreaming: boolean;
  isOpen: boolean;
  hasManualExpanded: boolean;
}): ReasoningVisibilityAction {
  if (isStreaming && !wasStreaming) {
    return 'expand';
  }
  if (!isStreaming && wasStreaming && isOpen && !hasManualExpanded) {
    return 'collapse-delayed';
  }
  return 'none';
}

export type { ToolVisibilityState };

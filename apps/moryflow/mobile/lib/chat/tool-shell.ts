/**
 * [PROVIDES]: Mobile Tool 壳层视图模型（状态文案、命令摘要、固定输出高度）
 * [DEPENDS]: @moryflow/agents-runtime/ui-message/tool-command-summary
 * [POS]: Mobile Tool Header/Content 的单一事实源
 * [UPDATE]: 2026-03-05 - 新增 outerSummary（优先 input.summary，缺失时状态+命令 fallback）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  resolveToolOuterSummary,
  type ToolOuterSummaryLabels,
} from '@moryflow/agents-runtime/ui-message/tool-command-summary';

export type MobileToolState =
  | 'input-streaming'
  | 'input-available'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-available'
  | 'output-error'
  | 'output-denied';

export const MOBILE_TOOL_OUTPUT_MAX_HEIGHT = 180;

const MOBILE_TOOL_STATUS_LABELS: Record<MobileToolState, string> = {
  'input-streaming': 'Running',
  'input-available': 'Running',
  'approval-requested': 'Running',
  'approval-responded': 'Running',
  'output-available': 'Success',
  'output-error': 'Error',
  'output-denied': 'Skipped',
};

export const resolveMobileToolStatusLabel = (state: MobileToolState): string => {
  return MOBILE_TOOL_STATUS_LABELS[state] ?? 'Running';
};

export type MobileToolShellLabels = {
  statusLabels?: Partial<Record<MobileToolState, string>>;
  summaryLabels?: Partial<ToolOuterSummaryLabels>;
};

export const resolveMobileToolShell = (input: {
  type: string;
  state: MobileToolState;
  input?: Record<string, unknown>;
  output?: unknown;
  labels?: MobileToolShellLabels;
}) => {
  const summary = resolveToolOuterSummary({
    type: input.type,
    state: input.state,
    input: input.input,
    output: input.output,
    labels: input.labels?.summaryLabels,
  });

  return {
    scriptType: summary.scriptType,
    command: summary.command,
    outerSummary: summary.outerSummary,
    statusLabel:
      input.labels?.statusLabels?.[input.state] ?? resolveMobileToolStatusLabel(input.state),
    outputMaxHeight: MOBILE_TOOL_OUTPUT_MAX_HEIGHT,
  };
};

export const buildMobileToolCopyText = (input: {
  output?: unknown;
  errorText?: string;
}): string => {
  if (typeof input.errorText === 'string' && input.errorText.length > 0) {
    return input.errorText;
  }

  if (typeof input.output === 'string') {
    return input.output;
  }

  if (typeof input.output === 'number' || typeof input.output === 'boolean') {
    return String(input.output);
  }

  if (input.output == null) {
    return '';
  }

  try {
    return JSON.stringify(input.output, null, 2);
  } catch {
    return String(input.output);
  }
};

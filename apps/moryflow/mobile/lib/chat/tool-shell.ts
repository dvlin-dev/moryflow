/**
 * [PROVIDES]: Mobile Tool 壳层视图模型（状态文案、命令摘要、固定输出高度）
 * [DEPENDS]: @moryflow/agents-runtime/ui-message/tool-command-summary
 * [POS]: Mobile Tool Header/Content 的单一事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { resolveToolCommandSummary } from '@moryflow/agents-runtime/ui-message/tool-command-summary';

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

export const resolveMobileToolShell = (input: {
  type: string;
  state: MobileToolState;
  input?: Record<string, unknown>;
  output?: unknown;
}) => {
  const summary = resolveToolCommandSummary({
    type: input.type,
    input: input.input,
    output: input.output,
  });

  return {
    scriptType: summary.scriptType,
    command: summary.command,
    statusLabel: resolveMobileToolStatusLabel(input.state),
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

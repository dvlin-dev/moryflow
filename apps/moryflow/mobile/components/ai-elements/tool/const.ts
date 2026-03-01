/**
 * Tool 组件类型和常量定义
 */

import type { ToolUIPart } from 'ai';

/** Tool 状态类型 */
export type ToolState =
  | ToolUIPart['state']
  | 'approval-requested'
  | 'approval-responded'
  | 'output-denied';

/** Tool 状态配置 */
export interface ToolStatusConfig {
  label: string;
  iconName: 'circle' | 'loader' | 'clock' | 'check-circle' | 'x-circle';
  colorClass: string;
  animate?: boolean;
}

/** 状态配置映射 */
export const TOOL_STATUS_CONFIG: Record<ToolState, ToolStatusConfig> = {
  'input-streaming': {
    label: 'Preparing',
    iconName: 'circle',
    colorClass: 'text-muted-foreground',
  },
  'input-available': {
    label: 'Running',
    iconName: 'loader',
    colorClass: 'text-muted-foreground',
    animate: true,
  },
  'approval-requested': {
    label: 'Awaiting',
    iconName: 'clock',
    colorClass: 'text-muted-foreground',
  },
  'approval-responded': {
    label: 'Confirmed',
    iconName: 'check-circle',
    colorClass: 'text-muted-foreground',
  },
  'output-available': {
    label: 'Done',
    iconName: 'check-circle',
    colorClass: 'text-muted-foreground',
  },
  'output-error': {
    label: 'Error',
    iconName: 'x-circle',
    colorClass: 'text-destructive',
  },
  'output-denied': {
    label: 'Skipped',
    iconName: 'x-circle',
    colorClass: 'text-muted-foreground',
  },
};

/** Tool 组件 Props */
export interface ToolProps {
  type: string;
  state: ToolState;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
  defaultOpen?: boolean;
  approval?: ToolUIPart['approval'];
  onToolApproval?: (input: { approvalId: string; remember: 'once' | 'always' }) => void;
}

/**
 * 从工具输入中提取显示名称
 */
export function getToolDisplayName(type: string, input?: Record<string, unknown>): string {
  if (input?.summary && typeof input.summary === 'string') {
    return input.summary.trim();
  }
  // type 格式通常是 "tool-xxx" -> "xxx"
  return type.split('-').slice(1).join('-') || type;
}

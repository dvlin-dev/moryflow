/**
 * Tool 组件类型和常量定义
 *
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { ToolUIPart } from 'ai';

/** Tool 状态类型 */
export type ToolState =
  | ToolUIPart['state']
  | 'approval-requested'
  | 'approval-responded'
  | 'output-denied';

/** Tool 状态配置 */
/** Tool 组件 Props */
export interface ToolProps {
  type: string;
  state: ToolState;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
  approval?: ToolUIPart['approval'];
  scriptType?: string;
  command?: string;
  statusLabel?: string;
  outputMaxHeight?: number;
  onToolApproval?: (input: { approvalId: string; remember: 'once' | 'always' }) => void;
}

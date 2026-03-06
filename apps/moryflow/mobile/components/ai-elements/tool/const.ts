/**
 * Tool 组件类型和常量定义
 *
 * [UPDATE]: 2026-03-05 - 精简为 Tool 核心类型定义，命令摘要/状态映射迁移到 lib/chat/tool-shell
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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

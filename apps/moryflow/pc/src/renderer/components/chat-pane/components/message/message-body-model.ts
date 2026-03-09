/**
 * [DEFINES]: MessageBodyModel - ChatMessage 主体渲染分组模型（view/edit/tool）
 * [USED_BY]: message-body.tsx, index.tsx, tool-part.tsx
 * [POS]: message-body 参数收敛类型中心
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import type { UIMessage } from 'ai';
import type { OrderedPartEntry } from '@moryflow/ui/ai/message';
import type { ToolDiffResult } from '@moryflow/ui/ai/tool';

export type ToolApprovalInput = {
  approvalId: string;
  action: 'once' | 'allow_type' | 'deny';
};

export type MessageToolOutputLabels = {
  result: string;
  error: string;
  targetFile: string;
  contentTooLong: string;
  outputTruncated: string;
  fullOutputPath: string;
  applyToFile: string;
  applied: string;
  applying: string;
  noTasks: string;
  tasksCompleted: (completed: number, total: number) => string;
};

export type MessageToolUiLabels = {
  approvalRequired: string;
  approvalRequestHint: string;
  approvalGranted: string;
  approvalAlreadyHandled: string;
  approveOnce: string;
  approveAlways: string;
  denyOnce: string;
  approvalHowToApplyTitle: string;
  approvalAlwaysAllowHint: string;
};

export type MessageToolSummaryLabels = {
  running: (input: { tool: string; command: string }) => string;
  success: (input: { tool: string; command: string }) => string;
  error: (input: { tool: string; command: string }) => string;
  skipped: (input: { tool: string; command: string }) => string;
};

export type MessageBodyViewModel = {
  message: UIMessage;
  visibleOrderedPartEntries: OrderedPartEntry[];
  showThinkingPlaceholder: boolean;
  cleanMessageText: string;
  isUser: boolean;
  streamdownAnimated: boolean;
  streamdownIsAnimating: boolean;
  lastTextOrderedPartIndex: number;
  thinkingText: string;
};

export type MessageBodyEditModel = {
  isEditing: boolean;
  editContent: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  contentRef?: RefObject<HTMLDivElement | null>;
  editContentStyle?: CSSProperties;
  onEditContentChange: (value: string) => void;
  onEditKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
};

export type MessageBodyToolModel = {
  onToolApproval?: (input: ToolApprovalInput) => void;
  statusLabels: Record<string, string>;
  summaryLabels: MessageToolSummaryLabels;
  outputLabels: MessageToolOutputLabels;
  uiLabels: MessageToolUiLabels;
  canApplyDiff: boolean;
  onApplyDiff: (result: ToolDiffResult) => Promise<void>;
  onApplyDiffSuccess: () => void;
  onApplyDiffError: (error: unknown) => void;
};

export type MessageBodyModel = {
  view: MessageBodyViewModel;
  edit: MessageBodyEditModel;
  tool: MessageBodyToolModel;
};

/**
 * [DEFINES]: MessageBodyModel - ChatMessage 主体渲染分组模型（view/edit/tool）
 * [USED_BY]: message-body.tsx, index.tsx, tool-part.tsx
 * [POS]: message-body 参数收敛类型中心
 * [UPDATE]: 2026-03-01 - 新增 view.showThinkingPlaceholder，避免 file-only assistant 误显示 loading
 * [UPDATE]: 2026-02-26 - 引入分组模型，避免 MessageBody props 膨胀
 * [UPDATE]: 2026-03-05 - 工具审批输入改为 action，并补充 Deny/适用范围提示文案键
 * [UPDATE]: 2026-03-05 - 移除 ToolOutput 失效回调 onOpenFullOutput，收敛为当前最小动作协议
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import type { UIMessage } from 'ai';
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
  orderedParts: UIMessage['parts'];
  showThinkingPlaceholder: boolean;
  cleanMessageText: string;
  isUser: boolean;
  streamdownAnimated: boolean;
  streamdownIsAnimating: boolean;
  lastTextPartIndex: number;
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

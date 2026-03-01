/**
 * [DEFINES]: MessageBodyModel - ChatMessage 主体渲染分组模型（view/edit/tool）
 * [USED_BY]: message-body.tsx, index.tsx, tool-part.tsx
 * [POS]: message-body 参数收敛类型中心
 * [UPDATE]: 2026-03-01 - 新增 view.showThinkingPlaceholder，避免 file-only assistant 误显示 loading
 * [UPDATE]: 2026-02-26 - 引入分组模型，避免 MessageBody props 膨胀
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import type { UIMessage } from 'ai';
import type { ToolDiffResult } from '@moryflow/ui/ai/tool';

export type ToolApprovalInput = {
  approvalId: string;
  remember: 'once' | 'always';
};

export type MessageToolOutputLabels = {
  result: string;
  error: string;
  targetFile: string;
  contentTooLong: string;
  outputTruncated: string;
  viewFullOutput: string;
  fullOutputPath: string;
  applyToFile: string;
  applied: string;
  applying: string;
  noTasks: string;
  tasksCompleted: (completed: number, total: number) => string;
};

export type MessageToolUiLabels = {
  parameters: string;
  approvalRequired: string;
  approvalRequestHint: string;
  approvalGranted: string;
  approveOnce: string;
  approveAlways: string;
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
  outputLabels: MessageToolOutputLabels;
  uiLabels: MessageToolUiLabels;
  onOpenFullOutput: (fullPath: string) => Promise<void>;
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

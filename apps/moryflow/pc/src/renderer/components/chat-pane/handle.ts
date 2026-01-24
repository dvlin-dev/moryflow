/**
 * [PROVIDES]: Chat Pane 辅助工具（上下文/消息片段处理）
 * [DEPENDS]: ai UIMessage
 * [POS]: Chat Pane 业务辅助逻辑
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { isFileUIPart, isReasoningUIPart, isTextUIPart, isToolUIPart, type UIMessage } from 'ai';
import type { AgentChatContext, AgentChatRequestOptions } from '@shared/ipc';
import { MAX_CONTEXT_CHARS } from './const';

export const computeAgentOptions = ({
  activeFilePath,
  contextSummary,
  preferredModelId,
}: {
  activeFilePath?: string | null;
  contextSummary?: string | null;
  preferredModelId?: string | null;
}): AgentChatRequestOptions | undefined => {
  const context: AgentChatContext = {};
  if (activeFilePath) {
    context.filePath = activeFilePath;
  }
  if (contextSummary && contextSummary.trim().length > 0) {
    context.summary = contextSummary.trim();
  }
  const options: AgentChatRequestOptions = {};
  if (context.filePath || context.summary) {
    options.context = context;
  }
  if (preferredModelId && preferredModelId.trim().length > 0) {
    options.preferredModelId = preferredModelId.trim();
  }
  return Object.keys(options).length > 0 ? options : undefined;
};

export const getMessageBody = (message: UIMessage) => {
  const textParts = message.parts?.filter(isTextUIPart).map((part) => part.text) ?? [];
  if (textParts.length > 0) {
    return textParts.join('\n');
  }
  return '';
};

export const getFileParts = (message: UIMessage) => message.parts?.filter(isFileUIPart) ?? [];
export const getToolParts = (message: UIMessage) => message.parts?.filter(isToolUIPart) ?? [];
export const getReasoningParts = (message: UIMessage) =>
  message.parts?.filter(isReasoningUIPart) ?? [];

export const canAttachContext = (
  activeFilePath?: string,
  activeFileContent?: string | null
): boolean => {
  return Boolean(activeFilePath && activeFileContent && activeFileContent.length > 0);
};

export const getContextDisabledHint = (
  activeFilePath?: string,
  activeFileContent?: string | null
): string | null => {
  if (!activeFilePath || !activeFileContent) {
    return 'No note selected';
  }
  if (activeFileContent.length === 0) {
    return 'File is empty';
  }
  return null;
};

const trimContextContent = (activeFileContent: string) => {
  if (activeFileContent.length > MAX_CONTEXT_CHARS) {
    return `${activeFileContent.slice(0, MAX_CONTEXT_CHARS)}\n\n...(content truncated)`;
  }
  return activeFileContent;
};

export const buildContextFile = (activeFilePath: string, activeFileContent: string) => {
  const trimmed = trimContextContent(activeFileContent);
  const fileName = activeFilePath.split(/[\\/]/).pop() ?? 'current-note.md';
  return new File([trimmed], fileName, { type: 'text/markdown' });
};

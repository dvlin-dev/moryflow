/**
 * [INPUT]: ChatPromptInputViewModelInput - 输入状态、文案与移除行为
 * [OUTPUT]: ChatPromptInputViewModel - 输入区 chips 与 footer 左侧渲染模型
 * [POS]: chat-prompt-input 视图模型构建器，收敛条件分支到单一事实源
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { File, Image, Quote, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ChatPromptInputAttachment = {
  id: string;
  filename?: string | null;
  mediaType?: string | null;
};

type ChatPromptInputSelectedSkill = {
  title: string;
  description?: string | null;
} | null;

type ChatPromptInputSelectionReference = {
  preview: string;
  filePath: string;
  isTruncated?: boolean;
} | null;

type ChatPromptInputFileChip = {
  key: string;
  icon: LucideIcon;
  label: string;
  tooltip?: string;
  removeLabel: string;
  onRemove: () => void;
};

type ChatPromptInputFooterLeftModel =
  | {
      mode: 'tools';
    }
  | {
      mode: 'speech';
      durationLabel: string;
    };

type ChatPromptInputViewModelInput = {
  attachments: ChatPromptInputAttachment[];
  selectedSkill: ChatPromptInputSelectedSkill;
  selectionReference: ChatPromptInputSelectionReference;
  contextFileCount: number;
  isSpeechActive: boolean;
  isProcessing: boolean;
  formattedDuration: string;
  labels: {
    imageLabel: string;
    attachmentLabel: string;
    transcribing: string;
  };
  removeLabels: {
    removeFile: string;
    removeSelectedSkill: string;
    removeReference: string;
  };
  handlers: {
    onClearSelectedSkill: () => void;
    onClearSelectionReference: () => void;
    onRemoveAttachment: (id: string) => void;
  };
};

export type ChatPromptInputViewModel = {
  shouldRenderChipsRow: boolean;
  fileChips: ChatPromptInputFileChip[];
  showContentTruncatedBadge: boolean;
  shouldRenderContextFiles: boolean;
  footerLeft: ChatPromptInputFooterLeftModel;
};

export function buildChatPromptInputViewModel(
  input: ChatPromptInputViewModelInput
): ChatPromptInputViewModel {
  const fileChips: ChatPromptInputFileChip[] = [];

  if (input.selectedSkill) {
    fileChips.push({
      key: 'selected-skill',
      icon: Wrench,
      label: input.selectedSkill.title,
      tooltip: input.selectedSkill.description ?? undefined,
      removeLabel: input.removeLabels.removeSelectedSkill,
      onRemove: input.handlers.onClearSelectedSkill,
    });
  }

  if (input.selectionReference) {
    fileChips.push({
      key: 'selection-reference',
      icon: Quote,
      label: input.selectionReference.preview,
      tooltip: input.selectionReference.filePath,
      removeLabel: input.removeLabels.removeReference,
      onRemove: input.handlers.onClearSelectionReference,
    });
  }

  for (const attachment of input.attachments) {
    const isImage = Boolean(attachment.mediaType?.startsWith('image/'));
    fileChips.push({
      key: attachment.id,
      icon: isImage ? Image : File,
      label:
        attachment.filename || (isImage ? input.labels.imageLabel : input.labels.attachmentLabel),
      tooltip: attachment.filename ?? undefined,
      removeLabel: input.removeLabels.removeFile,
      onRemove: () => {
        input.handlers.onRemoveAttachment(attachment.id);
      },
    });
  }

  return {
    shouldRenderChipsRow: fileChips.length > 0 || input.contextFileCount > 0,
    fileChips,
    showContentTruncatedBadge: Boolean(input.selectionReference?.isTruncated),
    shouldRenderContextFiles: input.contextFileCount > 0,
    footerLeft: input.isSpeechActive
      ? {
          mode: 'speech',
          durationLabel: input.isProcessing ? input.labels.transcribing : input.formattedDuration,
        }
      : { mode: 'tools' },
  };
}

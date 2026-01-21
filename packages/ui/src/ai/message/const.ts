/**
 * [DEFINES]: Message UI 类型定义
 * [USED_BY]: ai/message 组件
 * [POS]: Message 子模块类型入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import type { ComponentProps, HTMLAttributes, ReactElement } from 'react';
import type { FileUIPart, UIMessage } from 'ai';
import { Button } from '../../components/button';
import { Streamdown } from 'streamdown';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage['role'];
};

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export type MessageActionsProps = ComponentProps<'div'>;

export type MessageActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
};

export type MessageBranchContextType = {
  currentBranch: number;
  totalBranches: number;
  goToPrevious: () => void;
  goToNext: () => void;
  branches: ReactElement[];
  setBranches: (branches: ReactElement[]) => void;
};

export type MessageBranchProps = HTMLAttributes<HTMLDivElement> & {
  defaultBranch?: number;
  onBranchChange?: (branchIndex: number) => void;
};

export type MessageBranchContentProps = HTMLAttributes<HTMLDivElement>;

export type MessageBranchSelectorProps = HTMLAttributes<HTMLDivElement>;

export type MessageBranchPreviousProps = ComponentProps<typeof Button>;

export type MessageBranchNextProps = ComponentProps<typeof Button>;

export type MessageBranchPageProps = HTMLAttributes<HTMLSpanElement>;

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

export type MessageAttachmentProps = HTMLAttributes<HTMLDivElement> & {
  data: FileUIPart;
  className?: string;
  onRemove?: () => void;
  labels?: MessageAttachmentLabels;
};

export type MessageAttachmentsProps = ComponentProps<'div'>;

export type MessageToolbarProps = ComponentProps<'div'>;

export type MessageAttachmentLabels = {
  image?: string;
  attachment?: string;
  remove?: string;
  contextBadge?: string;
  contextExpand?: string;
  contextCollapse?: string;
  contextTruncated?: string;
};

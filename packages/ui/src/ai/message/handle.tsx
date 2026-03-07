/**
 * [PROVIDES]: MessageBranch 上下文
 * [DEPENDS]: React
 * [POS]: 消息分支组件的状态容器
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';

import { createContext, useContext } from 'react';

import type { MessageBranchContextType } from './const';

export const MessageBranchContext = createContext<MessageBranchContextType | null>(null);

export const useMessageBranch = () => {
  const context = useContext(MessageBranchContext);

  if (!context) {
    throw new Error('MessageBranch components must be used within MessageBranch');
  }

  return context;
};

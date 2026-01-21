/**
 * [PROVIDES]: MessageBranch 上下文
 * [DEPENDS]: React
 * [POS]: 消息分支组件的状态容器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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

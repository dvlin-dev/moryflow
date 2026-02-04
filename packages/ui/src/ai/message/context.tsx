/**
 * [PROVIDES]: ConversationMessageContext - 单条消息上下文
 * [DEPENDS]: React
 * [POS]: MessageRoot 获取 message/messages/index 的统一入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { ChatStatus, UIMessage } from 'ai';

export type ConversationMessageContextValue = {
  message: UIMessage;
  messages: UIMessage[];
  index: number;
  status?: ChatStatus;
};

const ConversationMessageContext = createContext<ConversationMessageContextValue | null>(null);

export type ConversationMessageProviderProps = ConversationMessageContextValue & {
  children: ReactNode;
};

export const ConversationMessageProvider = ({
  message,
  messages,
  index,
  status,
  children,
}: ConversationMessageProviderProps) => (
  <ConversationMessageContext.Provider value={{ message, messages, index, status }}>
    {children}
  </ConversationMessageContext.Provider>
);

export const useConversationMessage = (options?: { optional?: boolean }) => {
  const context = useContext(ConversationMessageContext);
  if (!context && !options?.optional) {
    throw new Error('ConversationMessageProvider is missing in the component tree.');
  }
  return context;
};

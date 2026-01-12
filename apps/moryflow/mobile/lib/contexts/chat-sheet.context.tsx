/**
 * [PROVIDES]: ChatSheetProvider / useChatSheet - AI Chat Sheet 状态管理
 * [DEPENDS]: React Context
 * [POS]: RootLayout 全局 Provider，给 Tabs/页面触发 AI Chat Sheet 打开/关闭
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ChatSheetContextValue {
  /** AI 聊天面板是否打开 */
  isChatOpen: boolean;
  /** 打开 AI 聊天面板 */
  openChat: () => void;
  /** 关闭 AI 聊天面板 */
  closeChat: () => void;
}

const ChatSheetContext = createContext<ChatSheetContextValue | null>(null);

interface ChatSheetProviderProps {
  children: ReactNode;
}

export function ChatSheetProvider({ children }: ChatSheetProviderProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const openChat = useCallback(() => setIsChatOpen(true), []);
  const closeChat = useCallback(() => setIsChatOpen(false), []);

  return (
    <ChatSheetContext.Provider
      value={{
        isChatOpen,
        openChat,
        closeChat,
      }}>
      {children}
    </ChatSheetContext.Provider>
  );
}

export function useChatSheet() {
  const context = useContext(ChatSheetContext);
  if (!context) {
    throw new Error('useChatSheet must be used within a ChatSheetProvider');
  }
  return context;
}

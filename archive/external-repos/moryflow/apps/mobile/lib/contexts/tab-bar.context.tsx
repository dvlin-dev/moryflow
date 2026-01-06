/**
 * 导航栏状态管理 Context
 * 
 * 用于控制底部液态玻璃导航栏的显示/隐藏状态
 * 例如在编辑器详情页需要隐藏导航栏
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TabBarContextValue {
  /** 导航栏是否可见 */
  visible: boolean;
  /** 设置导航栏可见性 */
  setVisible: (visible: boolean) => void;
  /** 隐藏导航栏 */
  hideTabBar: () => void;
  /** 显示导航栏 */
  showTabBar: () => void;
  /** AI 聊天面板是否打开 */
  isChatOpen: boolean;
  /** 打开 AI 聊天面板 */
  openChat: () => void;
  /** 关闭 AI 聊天面板 */
  closeChat: () => void;
}

const TabBarContext = createContext<TabBarContextValue | null>(null);

interface TabBarProviderProps {
  children: ReactNode;
}

export function TabBarProvider({ children }: TabBarProviderProps) {
  const [visible, setVisible] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const hideTabBar = useCallback(() => setVisible(false), []);
  const showTabBar = useCallback(() => setVisible(true), []);
  const openChat = useCallback(() => setIsChatOpen(true), []);
  const closeChat = useCallback(() => setIsChatOpen(false), []);

  return (
    <TabBarContext.Provider
      value={{
        visible,
        setVisible,
        hideTabBar,
        showTabBar,
        isChatOpen,
        openChat,
        closeChat,
      }}
    >
      {children}
    </TabBarContext.Provider>
  );
}

export function useTabBar() {
  const context = useContext(TabBarContext);
  if (!context) {
    throw new Error('useTabBar must be used within a TabBarProvider');
  }
  return context;
}

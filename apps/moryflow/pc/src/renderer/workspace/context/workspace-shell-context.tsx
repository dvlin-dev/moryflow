/**
 * [PROVIDES]: WorkspaceShellProvider - Shell 层 UI 状态/动作（布局尺寸、折叠、打开设置等）
 * [DEPENDS]: SettingsSection
 * [POS]: 解决 workspace 内部组件（Sidebar/TopBar/Editor/Chat）对 shell 行为的 props 透传
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { SettingsSection } from '@/components/settings-dialog/const';

export type WorkspaceShellController = {
  /** 侧边栏是否收起（与 ResizablePanel 的真实状态保持同步；由 Shell 维护） */
  sidebarCollapsed: boolean;
  /** 当前 sidebar 像素宽度（用于 TopBar 对齐） */
  sidebarWidth: number;
  /** 通过 ResizablePanel imperative handle 折叠/展开 sidebar */
  toggleSidebarPanel: () => void;
  /** AgentSub=workspace 时右侧 Chat 面板是否收起 */
  chatCollapsed: boolean;
  /** 折叠/展开 AgentSub=workspace 的右侧 Chat 面板 */
  toggleChatPanel: () => void;
  /** 打开设置对话框 */
  openSettings: (section?: SettingsSection) => void;
};

const ShellContext = createContext<WorkspaceShellController | null>(null);

export type WorkspaceShellProviderProps = {
  value: WorkspaceShellController;
  children: ReactNode;
};

export const WorkspaceShellProvider = ({ value, children }: WorkspaceShellProviderProps) => {
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
};

export const useWorkspaceShell = (): WorkspaceShellController => {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error('useWorkspaceShell must be used within <WorkspaceShellProvider>');
  }
  return ctx;
};

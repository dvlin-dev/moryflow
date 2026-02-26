/**
 * [PROVIDES]: WorkspaceShellProvider + useWorkspaceShell（store-first）
 * [DEPENDS]: workspace-shell-controller-store
 * [POS]: 解决 workspace 内部组件（Sidebar/TopBar/Editor/Chat）对 shell 行为的 props 透传
 */

import { useEffect, type ReactNode } from 'react';
import {
  resetWorkspaceShellControllerStore,
  syncWorkspaceShellControllerStore,
  useWorkspaceShellControllerStore,
  type WorkspaceShellController,
} from '../stores/workspace-shell-controller-store';

export type WorkspaceShellProviderProps = {
  value: WorkspaceShellController;
  children: ReactNode;
};

export const WorkspaceShellProvider = ({ value, children }: WorkspaceShellProviderProps) => {
  syncWorkspaceShellControllerStore(value);
  useEffect(() => () => resetWorkspaceShellControllerStore(), []);
  return <>{children}</>;
};

export const useWorkspaceShell = (): WorkspaceShellController => {
  return useWorkspaceShellControllerStore((state) => {
    if (!state.ready) {
      throw new Error('useWorkspaceShell must be used within <WorkspaceShellProvider>');
    }
    return state.controller;
  });
};

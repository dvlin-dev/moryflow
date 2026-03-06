/**
 * [PROVIDES]: WorkspaceShellProvider + useWorkspaceShell（store-first）
 * [DEPENDS]: workspace-shell-controller-store
 * [POS]: 解决 workspace 内部组件（Sidebar/TopBar/Editor/Chat）对 shell 行为的 props 透传
 * [UPDATE]: 2026-02-26 - shell controller 同步迁移到 useLayoutEffect，移除 render-phase 外部写入
 */

import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
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
  const [snapshotReady, setSnapshotReady] = useState(false);

  useLayoutEffect(() => {
    syncWorkspaceShellControllerStore(value);
    setSnapshotReady((prev) => prev || true);
  }, [value]);

  useEffect(() => () => resetWorkspaceShellControllerStore(), []);

  if (!snapshotReady) {
    return null;
  }

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

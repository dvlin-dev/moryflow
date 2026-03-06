/**
 * [PROVIDES]: workspace-shell-controller-store（Workspace Shell 控制器 store）
 * [DEPENDS]: zustand (vanilla), settings-dialog types
 * [POS]: 替代 shell context，统一提供 sidebar/chat 面板与 settings 打开动作
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { SettingsSection } from '@/components/settings-dialog/const';

export type WorkspaceShellController = {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  toggleSidebarPanel: () => void;
  chatCollapsed: boolean;
  toggleChatPanel: () => void;
  openSettings: (section?: SettingsSection) => void;
};

type WorkspaceShellControllerStoreState = {
  ready: boolean;
  controller: WorkspaceShellController;
  setController: (controller: WorkspaceShellController) => void;
  reset: () => void;
};

const noop = () => {};

const EMPTY_CONTROLLER: WorkspaceShellController = {
  sidebarCollapsed: false,
  sidebarWidth: 260,
  toggleSidebarPanel: noop,
  chatCollapsed: false,
  toggleChatPanel: noop,
  openSettings: noop,
};

const workspaceShellControllerStore = createStore<WorkspaceShellControllerStoreState>((set) => ({
  ready: false,
  controller: EMPTY_CONTROLLER,
  setController: (controller) => set({ ready: true, controller }),
  reset: () => set({ ready: false, controller: EMPTY_CONTROLLER }),
}));

const shouldSyncController = (
  current: WorkspaceShellControllerStoreState,
  controller: WorkspaceShellController
) =>
  !current.ready ||
  current.controller.sidebarCollapsed !== controller.sidebarCollapsed ||
  current.controller.sidebarWidth !== controller.sidebarWidth ||
  current.controller.chatCollapsed !== controller.chatCollapsed ||
  current.controller.toggleSidebarPanel !== controller.toggleSidebarPanel ||
  current.controller.toggleChatPanel !== controller.toggleChatPanel ||
  current.controller.openSettings !== controller.openSettings;

export const syncWorkspaceShellControllerStore = (controller: WorkspaceShellController) => {
  const state = workspaceShellControllerStore.getState();
  if (!shouldSyncController(state, controller)) {
    return;
  }
  state.setController(controller);
};

export const resetWorkspaceShellControllerStore = () => {
  workspaceShellControllerStore.getState().reset();
};

export const useWorkspaceShellControllerStore = <T>(
  selector: (state: WorkspaceShellControllerStoreState) => T
): T => useStore(workspaceShellControllerStore, selector);

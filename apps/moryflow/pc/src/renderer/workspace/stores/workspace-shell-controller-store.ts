/**
 * [PROVIDES]: workspace-shell-controller-store（Workspace Shell 控制器 store）
 * [DEPENDS]: zustand (vanilla), settings-dialog types
 * [POS]: 替代 shell context，统一提供 sidebar/chat 面板与 settings 打开动作
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { SettingsSection } from '@/components/settings-dialog/const';
import type { HomeCanvasRequest } from '../const';

export type WorkspaceShellController = {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  toggleSidebarPanel: () => void;
  chatCollapsed: boolean;
  toggleChatPanel: () => void;
  homeCanvasRequest: HomeCanvasRequest | null;
  requestHomeCanvas: (activePathAtRequest: string | null) => void;
  clearHomeCanvas: () => void;
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
  homeCanvasRequest: null,
  requestHomeCanvas: noop,
  clearHomeCanvas: noop,
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
  current.controller.homeCanvasRequest !== controller.homeCanvasRequest ||
  current.controller.toggleSidebarPanel !== controller.toggleSidebarPanel ||
  current.controller.toggleChatPanel !== controller.toggleChatPanel ||
  current.controller.requestHomeCanvas !== controller.requestHomeCanvas ||
  current.controller.clearHomeCanvas !== controller.clearHomeCanvas ||
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

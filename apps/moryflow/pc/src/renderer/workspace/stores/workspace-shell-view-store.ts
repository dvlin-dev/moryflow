/**
 * [PROVIDES]: useWorkspaceShellViewStore/useSyncWorkspaceShellViewStore - Workspace Shell 视图状态 store
 * [DEPENDS]: zustand (vanilla) + React useEffect
 * [POS]: DesktopWorkspaceShell 到 main-content/overlays 的 store-first 状态桥接
 * [UPDATE]: 2026-02-26 - 新增 shouldSync 快照比较，避免每次 render 无变化重复 setSnapshot
 * [UPDATE]: 2026-02-26 - layoutState 比较下沉为字段级，避免对象引用变化导致误判需要同步
 * [UPDATE]: 2026-02-26 - 新增 view store，移除 main-content/overlays props 平铺
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useLayoutEffect, type ReactNode } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { CommandAction } from '@/components/command-palette/const';
import type { SettingsSection } from '@/components/settings-dialog/const';
import type { ActiveDocument, DesktopWorkspaceDialogController, SelectedFile } from '../const';
import type { ShellLayoutState } from '../hooks/use-shell-layout-state';
import type { SidebarMode, Destination } from '../navigation/state';

type WorkspaceShellViewSnapshot = {
  destination: Destination;
  sidebarMode: SidebarMode;
  vaultPath: string;
  treeState: 'idle' | 'loading' | 'error';
  treeLength: number;
  selectedFile: SelectedFile | null;
  activeDoc: ActiveDocument | null;
  chatFallback: ReactNode;
  startupSkeleton: ReactNode;
  layoutState: ShellLayoutState;
  onToggleChatPanel: () => void;
  onOpenSettings: (section?: SettingsSection) => void;
  onChatReady: () => void;
  commandOpen: boolean;
  onCommandOpenChange: (open: boolean) => void;
  commandActions: CommandAction[];
  inputDialogState: DesktopWorkspaceDialogController['inputDialogState'];
  onInputDialogConfirm: (value: string) => void;
  onInputDialogCancel: () => void;
  settingsOpen: boolean;
  settingsSection: SettingsSection | undefined;
  onSettingsOpenChange: (open: boolean) => void;
};

type WorkspaceShellViewStoreState = WorkspaceShellViewSnapshot & {
  setSnapshot: (snapshot: WorkspaceShellViewSnapshot) => void;
};

const noop = () => {};

const workspaceShellViewStore = createStore<WorkspaceShellViewStoreState>((set) => ({
  destination: 'agent',
  sidebarMode: 'chat',
  vaultPath: '',
  treeState: 'idle',
  treeLength: 0,
  selectedFile: null,
  activeDoc: null,
  chatFallback: null,
  startupSkeleton: null,
  layoutState: {
    panelGroupRef: { current: null },
    sidebarPanelRef: { current: null },
    workspaceChatPanelRef: { current: null },
    sidebarCollapsed: false,
    chatCollapsed: false,
    sidebarWidth: 260,
    toggleSidebarPanel: noop,
    toggleChatPanel: noop,
    onSidebarCollapse: noop,
    onSidebarExpand: noop,
    onChatCollapse: noop,
    onChatExpand: noop,
    handleSidebarResize: noop,
    sidebarDefaultSizePercent: 25,
    sidebarMinSizePercent: 10,
    sidebarMaxSizePercent: 40,
    mainMinSizePercent: 60,
  },
  onToggleChatPanel: noop,
  onOpenSettings: noop,
  onChatReady: noop,
  commandOpen: false,
  onCommandOpenChange: noop,
  commandActions: [],
  inputDialogState: {
    open: false,
    title: '',
    resolve: null,
  },
  onInputDialogConfirm: noop,
  onInputDialogCancel: noop,
  settingsOpen: false,
  settingsSection: undefined,
  onSettingsOpenChange: noop,
  setSnapshot: (snapshot) => set(snapshot),
}));

const isSameLayoutState = (current: ShellLayoutState, next: ShellLayoutState) =>
  current.sidebarPanelRef === next.sidebarPanelRef &&
  current.workspaceChatPanelRef === next.workspaceChatPanelRef &&
  current.panelGroupRef === next.panelGroupRef &&
  current.sidebarCollapsed === next.sidebarCollapsed &&
  current.sidebarWidth === next.sidebarWidth &&
  current.chatCollapsed === next.chatCollapsed &&
  current.toggleSidebarPanel === next.toggleSidebarPanel &&
  current.toggleChatPanel === next.toggleChatPanel &&
  current.onSidebarCollapse === next.onSidebarCollapse &&
  current.onSidebarExpand === next.onSidebarExpand &&
  current.onChatCollapse === next.onChatCollapse &&
  current.onChatExpand === next.onChatExpand &&
  current.handleSidebarResize === next.handleSidebarResize &&
  current.sidebarDefaultSizePercent === next.sidebarDefaultSizePercent &&
  current.sidebarMinSizePercent === next.sidebarMinSizePercent &&
  current.sidebarMaxSizePercent === next.sidebarMaxSizePercent &&
  current.mainMinSizePercent === next.mainMinSizePercent;

const shouldSyncSnapshot = (
  current: WorkspaceShellViewStoreState,
  next: WorkspaceShellViewSnapshot
) =>
  current.destination !== next.destination ||
  current.sidebarMode !== next.sidebarMode ||
  current.vaultPath !== next.vaultPath ||
  current.treeState !== next.treeState ||
  current.treeLength !== next.treeLength ||
  current.selectedFile !== next.selectedFile ||
  current.activeDoc !== next.activeDoc ||
  current.chatFallback !== next.chatFallback ||
  current.startupSkeleton !== next.startupSkeleton ||
  !isSameLayoutState(current.layoutState, next.layoutState) ||
  current.onToggleChatPanel !== next.onToggleChatPanel ||
  current.onOpenSettings !== next.onOpenSettings ||
  current.onChatReady !== next.onChatReady ||
  current.commandOpen !== next.commandOpen ||
  current.onCommandOpenChange !== next.onCommandOpenChange ||
  current.commandActions !== next.commandActions ||
  current.inputDialogState !== next.inputDialogState ||
  current.onInputDialogConfirm !== next.onInputDialogConfirm ||
  current.onInputDialogCancel !== next.onInputDialogCancel ||
  current.settingsOpen !== next.settingsOpen ||
  current.settingsSection !== next.settingsSection ||
  current.onSettingsOpenChange !== next.onSettingsOpenChange;

export const useWorkspaceShellViewStore = <T>(
  selector: (state: WorkspaceShellViewStoreState) => T
): T => useStore(workspaceShellViewStore, selector);

export const useSyncWorkspaceShellViewStore = (snapshot: WorkspaceShellViewSnapshot) => {
  useLayoutEffect(() => {
    const state = workspaceShellViewStore.getState();
    if (!shouldSyncSnapshot(state, snapshot)) {
      return;
    }
    state.setSnapshot(snapshot);
  }, [snapshot]);
};

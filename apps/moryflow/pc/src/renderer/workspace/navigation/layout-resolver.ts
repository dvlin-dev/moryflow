/**
 * [PROVIDES]: resolveWorkspaceLayout - Workspace 布局单一派生入口（header/sidebar/main/chat/top-tabs）
 * [DEPENDS]: navigation/state
 * [POS]: 收敛 destination + sidebarMode 的 UI 派生规则，避免多组件重复判断
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { type Destination, type NavigationView, type SidebarMode } from './state';
import { getModuleMainViewState } from './modules-registry';

export type MainViewState = 'agent-chat' | 'agent-home' | 'remote-agents' | 'skills' | 'sites';
export type ChatPanePlacement = 'main' | 'panel' | 'parking';

export type WorkspaceLayout = {
  destination: Destination;
  sidebarMode: SidebarMode;
  headerMode: SidebarMode;
  sidebarContentMode: SidebarMode;
  mainViewState: MainViewState;
  chatPanePlacement: ChatPanePlacement;
  showTopTabs: boolean;
};

const resolveMainViewState = (destination: Destination, mode: SidebarMode): MainViewState => {
  if (destination !== 'agent') {
    return getModuleMainViewState(destination);
  }
  return mode === 'home' ? 'agent-home' : 'agent-chat';
};

const resolveChatPanePlacement = (
  destination: Destination,
  mode: SidebarMode
): ChatPanePlacement => {
  if (destination !== 'agent') return 'parking';
  return mode === 'chat' ? 'main' : 'panel';
};

export const resolveWorkspaceLayout = (input: NavigationView): WorkspaceLayout => {
  const destination = input.destination;
  const sidebarMode = input.sidebarMode;
  const effectiveSidebarMode: SidebarMode = destination === 'agent' ? sidebarMode : 'home';

  return {
    destination,
    sidebarMode: effectiveSidebarMode,
    headerMode: effectiveSidebarMode,
    sidebarContentMode: effectiveSidebarMode,
    mainViewState: resolveMainViewState(destination, effectiveSidebarMode),
    chatPanePlacement: resolveChatPanePlacement(destination, effectiveSidebarMode),
    showTopTabs: destination === 'agent' && effectiveSidebarMode === 'home',
  };
};

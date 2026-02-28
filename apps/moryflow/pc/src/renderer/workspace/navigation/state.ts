/**
 * [PROVIDES]: NavigationState - destination + sidebarMode 的单一事实来源（纯函数 + 类型）
 * [DEPENDS]: -
 * [POS]: Workspace Shell 的导航语义层（不包含 React、无副作用）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type Destination = 'agent' | 'skills' | 'sites';

export type SidebarMode = 'chat' | 'home';

export type NavigationState = {
  destination: Destination;
  sidebarMode: SidebarMode;
};

export const DEFAULT_NAVIGATION_STATE: NavigationState = {
  destination: 'agent',
  sidebarMode: 'chat',
};

export const isSidebarMode = (value: unknown): value is SidebarMode =>
  value === 'chat' || value === 'home';

export const normalizeSidebarMode = (value: unknown): SidebarMode =>
  isSidebarMode(value) ? value : 'chat';

export const setSidebarMode = (state: NavigationState, mode: SidebarMode): NavigationState => ({
  destination: 'agent',
  sidebarMode: mode,
});

export const ensureAgent = (state: NavigationState, mode?: SidebarMode): NavigationState =>
  setSidebarMode(state, mode ?? state.sidebarMode);

export const go = (state: NavigationState, destination: Destination): NavigationState => {
  if (destination === 'agent') {
    return { ...state, destination };
  }
  return { destination, sidebarMode: 'home' };
};

/**
 * [PROVIDES]: NavigationState - 工作区/模块判别联合状态（纯函数 + 类型）
 * [DEPENDS]: -
 * [POS]: Workspace Shell 的导航语义层（不包含 React、无副作用）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export type ModuleDestination = 'agent-module' | 'skills' | 'sites';
export type Destination = 'agent' | ModuleDestination;

export type SidebarMode = 'chat' | 'home';

export type AgentWorkspaceNavigationState = {
  kind: 'agent-workspace';
  sidebarMode: SidebarMode;
};

export type ModuleNavigationState = {
  kind: 'module';
  module: ModuleDestination;
};

export type NavigationState = AgentWorkspaceNavigationState | ModuleNavigationState;
export type NavigationView = {
  destination: Destination;
  sidebarMode: SidebarMode;
};

export const DEFAULT_NAVIGATION_STATE: NavigationState = {
  kind: 'agent-workspace',
  sidebarMode: 'chat',
};

export const isSidebarMode = (value: unknown): value is SidebarMode =>
  value === 'chat' || value === 'home';

export const normalizeSidebarMode = (value: unknown): SidebarMode =>
  isSidebarMode(value) ? value : 'chat';

export const isModuleDestination = (value: unknown): value is ModuleDestination =>
  value === 'agent-module' || value === 'skills' || value === 'sites';

export const getDestination = (state: NavigationState): Destination =>
  state.kind === 'agent-workspace' ? 'agent' : state.module;

export const getSidebarMode = (state: NavigationState): SidebarMode =>
  state.kind === 'agent-workspace' ? state.sidebarMode : 'home';

const toNavigationState = (view: NavigationView): NavigationState =>
  view.destination === 'agent'
    ? { kind: 'agent-workspace', sidebarMode: view.sidebarMode }
    : { kind: 'module', module: view.destination };

const toNavigationView = (state: NavigationState): NavigationView => ({
  destination: getDestination(state),
  sidebarMode: getSidebarMode(state),
});

export const setSidebarMode = (state: NavigationState, mode: SidebarMode): NavigationState => ({
  kind: 'agent-workspace',
  sidebarMode: mode,
});

export const ensureAgent = (state: NavigationState, mode?: SidebarMode): NavigationState =>
  setSidebarMode(state, mode ?? getSidebarMode(state));

export const normalizeNoVaultNavigation = (state: NavigationState): NavigationState => {
  if (state.kind === 'module' && state.module === 'agent-module') {
    return state;
  }
  if (state.kind === 'agent-workspace' && state.sidebarMode === 'home') {
    return state;
  }
  return { kind: 'agent-workspace', sidebarMode: 'home' };
};

export const normalizeNoVaultNavigationView = (view: NavigationView): NavigationView =>
  toNavigationView(normalizeNoVaultNavigation(toNavigationState(view)));

export const go = (state: NavigationState, destination: Destination): NavigationState => {
  if (destination === 'agent') {
    return ensureAgent(state, getSidebarMode(state));
  }
  return { kind: 'module', module: destination };
};

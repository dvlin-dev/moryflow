/**
 * [PROVIDES]: NavigationState - destination + agentSub 的单一事实来源（纯函数 + 类型）
 * [DEPENDS]: -
 * [POS]: Workspace Shell 的导航语义层（不包含 React、无副作用）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type Destination = 'agent' | 'skills' | 'sites';

export type AgentSub = 'chat' | 'workspace';

export type NavigationState = {
  destination: Destination;
  agentSub: AgentSub;
};

export const DEFAULT_NAVIGATION_STATE: NavigationState = {
  destination: 'agent',
  agentSub: 'chat',
};

export const isAgentSub = (value: unknown): value is AgentSub =>
  value === 'chat' || value === 'workspace';

export const normalizeAgentSub = (value: unknown): AgentSub => (isAgentSub(value) ? value : 'chat');

export const ensureAgent = (state: NavigationState, sub?: AgentSub): NavigationState => ({
  destination: 'agent',
  agentSub: sub ?? state.agentSub,
});

export const go = (state: NavigationState, destination: Destination): NavigationState => ({
  ...state,
  destination,
});

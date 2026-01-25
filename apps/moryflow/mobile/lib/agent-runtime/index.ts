/**
 * [PROVIDES]: initAgentRuntime, runChatTurn, prepareCompaction, createChatSession - Mobile Agent 运行时
 * [DEPENDS]: agents, agents-runtime, agents-tools - Agent 框架核心
 * [POS]: Mobile 端 Agent 运行时入口，与 PC 端 agent-runtime 对应，适配移动端平台
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// ============ Runtime 核心 ============

export {
  initAgentRuntime,
  getAgentRuntime,
  isRuntimeInitialized,
  runChatTurn,
  prepareCompaction,
  createChatSession,
  getVaultRoot,
  generateSessionTitle,
} from './runtime';

// ============ 类型定义 ============

export type {
  MobileAgentRuntime,
  MobileAgentRuntimeOptions,
  MobileAgentStreamResult,
  MobileChatTurnResult,
} from './types';
export { MAX_AGENT_TURNS } from './types';

// ============ 平台适配 ============

export {
  createMobileCapabilities,
  createMobileCrypto,
  getDefaultVaultRoot,
  ensureVaultExists,
} from './mobile-adapter';

export { createLogger, mobileFetch } from './adapters';

// ============ 会话管理 ============

export {
  mobileSessionStore,
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  getHistory,
  appendHistory,
  clearHistory,
  generateTitle,
  getUiMessages,
  saveUiMessages,
  clearUiMessages,
} from './session-store';

// ============ 设置管理 ============

export {
  loadSettings,
  saveSettings,
  updateSettings,
  updateProvider,
  upsertCustomProvider,
  removeCustomProvider,
  setDefaultModel,
  getSettings,
  onSettingsChange,
  DEFAULT_SETTINGS,
  type AgentSettings,
  type UserProviderConfig,
  type CustomProviderConfig,
} from './settings-store';

// ============ Membership Bridge ============

export {
  getMembershipConfig,
  setMembershipConfig,
  syncMembershipConfig,
} from './membership-bridge';

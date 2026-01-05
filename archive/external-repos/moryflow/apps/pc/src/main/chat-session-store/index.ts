/**
 * [PROVIDES]: chatSessionStore, desktopSessionStore - 聊天会话持久化
 * [DEPENDS]: handle.js, session-store-adapter.js - 存储实现与适配器
 * [POS]: PC 端会话存储入口，基于 electron-store 持久化对话历史
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */
export { chatSessionStore } from './handle.js'
export { desktopSessionStore } from './session-store-adapter.js'
export type { PersistedChatSession, ChatSessionStoreShape } from './const.js'

/**
 * [PROVIDES]: registerChatHandlers - 聊天 IPC 处理器注册
 * [DEPENDS]: handlers.js - IPC 处理器实现
 * [POS]: PC 端聊天模块入口，向主进程注册聊天相关 IPC 通道
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */
export { registerChatHandlers } from './handlers.js'

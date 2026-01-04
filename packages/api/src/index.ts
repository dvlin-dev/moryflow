/**
 * [PROVIDES]: API_PATHS, ServerApiClient, FileIndexClient - 共享 API 客户端与类型
 * [DEPENDS]: 无外部依赖
 * [POS]: 前端共享层，被 pc、mobile、admin 应用依赖，类型需与 server 端保持同步
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// API 路径常量
export * from './paths'

// Membership 模块（类型和常量）
export * from './membership'

// FileIndex 模块
export * from './file-index'

// 账户模块
export * from './account'

// Cloud Sync 模块（类型）
export * from './cloud-sync'

// Server API 客户端
export * from './client'

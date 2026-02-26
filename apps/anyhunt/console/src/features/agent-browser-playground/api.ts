/**
 * [PROVIDES]: Agent/Browser Playground API 统一导出层
 * [DEPENDS]: browser-api, agent-api
 * [POS]: 兼容导出入口（逐步迁移到分域 API 文件）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export * from './browser-api';
export * from './agent-api';

/**
 * Browser Ports Export
 *
 * [PROVIDES]: Browser -> Agent ports/facade exports
 * [POS]: 集中导出 ports，避免跨模块直接引用内部实现
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export {
  BrowserAgentPortService,
  type BrowserAgentPort,
  type BrowserAgentSession,
  type BrowserAgentSearchResult,
} from './browser-agent.port';

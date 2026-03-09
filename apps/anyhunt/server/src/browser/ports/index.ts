/**
 * Browser Ports Export
 *
 * [PROVIDES]: Browser -> Agent ports/facade exports
 * [POS]: 集中导出 ports，避免跨模块直接引用内部实现
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export {
  BrowserAgentPortService,
  type BrowserAgentPort,
  type BrowserAgentSession,
  type BrowserAgentSearchResult,
} from './browser-agent.port';

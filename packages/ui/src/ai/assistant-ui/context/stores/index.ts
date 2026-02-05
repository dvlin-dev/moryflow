/**
 * [PROVIDES]: assistant-ui stores barrel
 * [DEPENDS]: ThreadViewport store
 * [POS]: mirror @assistant-ui/react context stores 导出（v0.12.6）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type { ThreadViewportState } from './ThreadViewport';
export { makeThreadViewportStore } from './ThreadViewport';

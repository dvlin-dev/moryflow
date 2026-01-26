/**
 * [DEFINES]: Mode switch audit event
 * [USED_BY]: PC/Mobile mode switch auditing
 * [POS]: 会话模式切换审计结构定义
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { AgentAccessMode } from './types';

export type ModeSwitchAuditEvent = {
  eventId: string;
  sessionId: string;
  previousMode: AgentAccessMode;
  nextMode: AgentAccessMode;
  source: 'pc' | 'mobile';
  timestamp: number;
};

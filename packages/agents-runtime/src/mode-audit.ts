/**
 * [DEFINES]: Mode switch audit event
 * [USED_BY]: PC/Mobile mode switch auditing
 * [POS]: 会话模式切换审计结构定义
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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

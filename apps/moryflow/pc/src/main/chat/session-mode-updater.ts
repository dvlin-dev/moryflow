/**
 * [INPUT]: 会话模式切换请求（sessionId + target mode）
 * [OUTPUT]: 更新后的会话摘要（自动放行与审计异步执行）
 * [POS]: chat:sessions:updateMode 的核心流程，隔离可测试的竞态边界
 * [UPDATE]: 2026-03-03 - 模式切换改为“同步更新 + 异步自动放行”，避免 await 期间 stale updated 事件复活已删除会话
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { randomUUID } from 'node:crypto';
import type { ModeSwitchAuditEvent } from '@moryflow/agents-runtime';
import type { ChatSessionSummary } from '../../shared/ipc.js';
import type { DesktopModeSwitchAuditWriter } from '../agent-runtime/mode-audit.js';

type SessionMode = ChatSessionSummary['mode'];

type SessionStoreLike = {
  getSummary: (sessionId: string) => ChatSessionSummary;
  updateSessionMeta: (sessionId: string, data: { mode?: SessionMode }) => ChatSessionSummary;
};

type UpdateModeEvent = {
  type: 'updated';
  session: ChatSessionSummary;
};

export const updateSessionModeAndScheduleAutoApprove = (input: {
  sessionId: string;
  mode: SessionMode;
  sessionStore: SessionStoreLike;
  modeAuditWriter: DesktopModeSwitchAuditWriter;
  autoApprovePendingForSession: (input: { sessionId: string }) => Promise<number>;
  broadcastSessionEvent: (event: UpdateModeEvent) => void;
  createEventId?: () => string;
  now?: () => number;
}): ChatSessionSummary => {
  const current = input.sessionStore.getSummary(input.sessionId);
  if (current.mode === input.mode) {
    return current;
  }

  const session = input.sessionStore.updateSessionMeta(input.sessionId, { mode: input.mode });
  input.broadcastSessionEvent({ type: 'updated', session });

  if (input.mode === 'full_access') {
    void input.autoApprovePendingForSession({ sessionId: input.sessionId }).catch((error) => {
      console.error('[chat] auto-approve pending approvals failed', error);
    });
  }

  const event: ModeSwitchAuditEvent = {
    eventId: input.createEventId?.() ?? randomUUID(),
    sessionId: input.sessionId,
    previousMode: current.mode,
    nextMode: input.mode,
    source: 'pc',
    timestamp: input.now?.() ?? Date.now(),
  };
  void input.modeAuditWriter.append(event).catch((error) => {
    console.warn('[chat] mode audit failed', error);
  });

  return session;
};

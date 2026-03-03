/**
 * [PROVIDES]: Desktop Mode Switch 审计日志（JSONL）
 * [DEPENDS]: agents-runtime, ./audit-log
 * [POS]: PC 会话模式切换审计
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { ModeSwitchAuditEvent } from '@moryflow/agents-runtime';
import { appendDesktopAuditLog } from './audit-log.js';

export type DesktopModeSwitchAuditWriter = {
  append: (event: ModeSwitchAuditEvent) => Promise<void>;
};

export const createDesktopModeSwitchAuditWriter = (): DesktopModeSwitchAuditWriter => ({
  async append(event) {
    await appendDesktopAuditLog({
      sessionId: event.sessionId,
      suffix: '.mode.jsonl',
      payload: event,
    });
  },
});

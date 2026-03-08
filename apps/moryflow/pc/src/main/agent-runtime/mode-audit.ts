/**
 * [PROVIDES]: Desktop Mode Switch 审计日志（JSONL）
 * [DEPENDS]: agents-runtime, ./audit-log
 * [POS]: PC 会话模式切换审计
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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

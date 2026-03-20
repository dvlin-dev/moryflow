/**
 * [PROVIDES]: Desktop Permission 审计日志（JSONL）
 * [DEPENDS]: agents-runtime, ./audit-log
 * [POS]: PC Agent Runtime 权限审计落地
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { PermissionAuditEvent } from '@moryflow/agents-runtime';
import { appendDesktopAuditLog } from '../audit-log.js';

export type DesktopPermissionAuditWriter = {
  append: (event: PermissionAuditEvent) => Promise<void>;
};

export const createDesktopPermissionAuditWriter = (): DesktopPermissionAuditWriter => ({
  async append(event) {
    await appendDesktopAuditLog({
      sessionId: event.sessionId,
      suffix: '.permission.jsonl',
      payload: event,
    });
  },
});

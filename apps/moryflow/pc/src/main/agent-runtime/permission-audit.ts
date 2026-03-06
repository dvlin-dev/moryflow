/**
 * [PROVIDES]: Desktop Permission 审计日志（JSONL）
 * [DEPENDS]: agents-runtime, ./audit-log
 * [POS]: PC Agent Runtime 权限审计落地
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { PermissionAuditEvent } from '@moryflow/agents-runtime';
import { appendDesktopAuditLog } from './audit-log.js';

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

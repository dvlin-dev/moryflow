/**
 * [PROVIDES]: Desktop Permission 审计日志（JSONL）
 * [DEPENDS]: node:fs, node:path
 * [POS]: PC Agent Runtime 权限审计落地
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { PermissionAuditEvent } from '@anyhunt/agents-runtime';

const AUDIT_DIR = path.join(os.homedir(), '.moryflow', 'logs', 'agent-audit');

export type DesktopPermissionAuditWriter = {
  append: (event: PermissionAuditEvent) => Promise<void>;
};

export const createDesktopPermissionAuditWriter = (): DesktopPermissionAuditWriter => ({
  async append(event) {
    await fs.mkdir(AUDIT_DIR, { recursive: true });
    const filePath = path.join(AUDIT_DIR, `${event.sessionId}.jsonl`);
    const line = `${JSON.stringify(event)}\n`;
    await fs.appendFile(filePath, line, 'utf-8');
  },
});

/**
 * [PROVIDES]: Mobile Permission 审计日志（JSONL）
 * [DEPENDS]: expo-file-system
 * [POS]: Mobile Agent Runtime 权限审计落地
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Directory, File, Paths } from 'expo-file-system';
import type { PermissionAuditEvent } from '@moryflow/agents-runtime';

const AUDIT_DIR = Paths.join(Paths.document.uri, 'agent-audit');

export type MobilePermissionAuditWriter = {
  append: (event: PermissionAuditEvent) => Promise<void>;
};

const ensureAuditDir = (): Directory => {
  const dir = new Directory(AUDIT_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
};

export const createMobilePermissionAuditWriter = (): MobilePermissionAuditWriter => {
  let pendingWrite = Promise.resolve();

  const append = async (event: PermissionAuditEvent): Promise<void> => {
    pendingWrite = pendingWrite
      .catch((error) => {
        console.warn('[permission] audit write failed, retrying', error);
      })
      .then(async () => {
        const dir = ensureAuditDir();
        const filePath = Paths.join(dir.uri, `${event.sessionId}.jsonl`);
        const file = new File(filePath);
        const line = `${JSON.stringify(event)}\n`;
        if (file.exists) {
          const existing = await file.text();
          await file.write(existing + line);
        } else {
          await file.write(line);
        }
      });
    return pendingWrite;
  };

  return { append };
};

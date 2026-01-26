/**
 * [PROVIDES]: Mobile Mode Switch 审计日志（JSONL）
 * [DEPENDS]: expo-file-system
 * [POS]: Mobile 会话模式切换审计
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Directory, File, Paths } from 'expo-file-system';
import type { ModeSwitchAuditEvent } from '@anyhunt/agents-runtime';

const AUDIT_DIR = Paths.join(Paths.document.uri, 'agent-audit');

export type MobileModeSwitchAuditWriter = {
  append: (event: ModeSwitchAuditEvent) => Promise<void>;
};

const ensureAuditDir = (): Directory => {
  const dir = new Directory(AUDIT_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
};

export const createMobileModeSwitchAuditWriter = (): MobileModeSwitchAuditWriter => {
  let pendingWrite = Promise.resolve();

  const append = async (event: ModeSwitchAuditEvent): Promise<void> => {
    pendingWrite = pendingWrite
      .catch((error) => {
        console.warn('[mode-switch] audit write failed, retrying', error);
      })
      .then(async () => {
        const dir = ensureAuditDir();
        const filePath = Paths.join(dir.uri, `${event.sessionId}.mode.jsonl`);
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

const writer = createMobileModeSwitchAuditWriter();

export const recordModeSwitch = async (event: ModeSwitchAuditEvent) => {
  try {
    await writer.append(event);
  } catch (error) {
    console.warn('[mode-switch] audit failed', error);
  }
};

/* @vitest-environment node */

import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DESKTOP_AUDIT_DIR, resolveDesktopAuditFilePath } from './audit-log';

describe('resolveDesktopAuditFilePath', () => {
  it('会将 sessionId 归一化为安全文件名并约束在审计目录内', () => {
    const filePath = resolveDesktopAuditFilePath('../../etc/passwd', '.bash.jsonl');
    const relative = path.relative(DESKTOP_AUDIT_DIR, filePath);
    const fileName = path.basename(filePath);

    expect(relative.startsWith('..')).toBe(false);
    expect(path.isAbsolute(relative)).toBe(false);
    expect(fileName.endsWith('.bash.jsonl')).toBe(true);
    expect(fileName.includes('..')).toBe(false);
    expect(fileName.includes('/')).toBe(false);
    expect(fileName.includes('\\')).toBe(false);
  });

  it('非法后缀应直接拒绝', () => {
    expect(() => resolveDesktopAuditFilePath('chat-a', '../escape.jsonl')).toThrow(
      'Invalid audit log suffix'
    );
  });
});

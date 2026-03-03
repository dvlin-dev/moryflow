/* @vitest-environment node */

import { describe, expect, it } from 'vitest';
import { buildBashAuditRecord, type BashCommandAuditInput } from './bash-audit';

const createEvent = (command: string): BashCommandAuditInput => ({
  sessionId: 'chat-a',
  userId: 'user-a',
  command,
  requestedCwd: '.',
  resolvedCwd: '.',
  exitCode: 0,
  durationMs: 18,
  failed: false,
  timestamp: 1_700_000_000_000,
});

describe('buildBashAuditRecord', () => {
  it('默认不落盘命令明文，仅保留结构化特征与指纹', () => {
    const record = buildBashAuditRecord(createEvent('echo hello | tee out.txt > logs.txt'));

    expect(record.commandPreview).toBeUndefined();
    expect(record.commandFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(record.argTokenCount).toBe(7);
    expect(record.containsPipe).toBe(true);
    expect(record.containsRedirect).toBe(true);
    expect(record.containsEnvAssignment).toBe(false);
  });

  it('显式开启预览时仍需强制脱敏', () => {
    const command =
      'export API_KEY=demo_api_key_value && curl https://demo:demo_password@example.com --token=<demo-token>';
    const record = buildBashAuditRecord(createEvent(command), {
      persistCommandPreview: true,
      previewMaxChars: 200,
    });

    expect(record.commandPreview).toBeDefined();
    expect(record.commandPreview).toContain('API_KEY=[REDACTED]');
    expect(record.commandPreview).toContain('demo:[REDACTED]@example.com');
    expect(record.commandPreview).toContain('--token=[REDACTED]');
    expect(record.commandPreview).not.toContain('demo_api_key_value');
    expect(record.commandPreview).not.toContain('demo_password');
    expect(record.commandPreview).not.toContain('<demo-token>');
  });
});

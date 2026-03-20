/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PermissionAuditEvent } from '@moryflow/agents-runtime';

const { appendDesktopAuditLogMock } = vi.hoisted(() => ({
  appendDesktopAuditLogMock: vi.fn(),
}));

vi.mock('./audit-log.js', () => ({
  appendDesktopAuditLog: appendDesktopAuditLogMock,
}));

import { createDesktopPermissionAuditWriter } from './permission-audit.js';

const createPermissionEvent = (): PermissionAuditEvent => ({
  eventId: 'evt-1',
  sessionId: 'chat-a',
  mode: 'ask',
  decision: 'ask',
  permissionDomain: 'read',
  targets: ['vault:/docs/a.md'],
  timestamp: Date.now(),
});

describe('createDesktopPermissionAuditWriter', () => {
  beforeEach(() => {
    appendDesktopAuditLogMock.mockReset();
  });

  it('使用 permission 专属后缀写入审计日志', async () => {
    const writer = createDesktopPermissionAuditWriter();
    const payload = createPermissionEvent();

    await writer.append(payload);

    expect(appendDesktopAuditLogMock).toHaveBeenCalledTimes(1);
    expect(appendDesktopAuditLogMock).toHaveBeenCalledWith({
      sessionId: payload.sessionId,
      suffix: '.permission.jsonl',
      payload,
    });
  });
});

/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatSessionSummary } from '../../shared/ipc.js';
import { updateSessionModeAndScheduleAutoApprove } from './session-mode-updater.js';

const buildSession = (overrides: Partial<ChatSessionSummary> = {}): ChatSessionSummary => ({
  id: 'session-1',
  title: 'New thread',
  createdAt: 1,
  updatedAt: 1,
  vaultPath: '/tmp/vault',
  mode: 'ask',
  ...overrides,
});

describe('session-mode-updater', () => {
  const getSummary = vi.fn();
  const updateSessionMeta = vi.fn();
  const autoApprovePendingForSession = vi.fn();
  const broadcastSessionEvent = vi.fn();
  const modeAuditWriter = { append: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    modeAuditWriter.append.mockResolvedValue(undefined);
    autoApprovePendingForSession.mockResolvedValue(0);
  });

  it('mode 未变化时直接返回当前会话且不触发副作用', () => {
    const current = buildSession({ mode: 'ask' });
    getSummary.mockReturnValue(current);

    const result = updateSessionModeAndScheduleAutoApprove({
      sessionId: current.id,
      mode: 'ask',
      sessionStore: { getSummary, updateSessionMeta },
      modeAuditWriter,
      autoApprovePendingForSession,
      broadcastSessionEvent,
    });

    expect(result).toBe(current);
    expect(updateSessionMeta).not.toHaveBeenCalled();
    expect(broadcastSessionEvent).not.toHaveBeenCalled();
    expect(autoApprovePendingForSession).not.toHaveBeenCalled();
    expect(modeAuditWriter.append).not.toHaveBeenCalled();
  });

  it('切到 full_access 时同步返回会话并后台触发自动放行', async () => {
    const current = buildSession({ mode: 'ask' });
    const updated = buildSession({ mode: 'full_access', updatedAt: 2 });
    getSummary.mockReturnValue(current);
    updateSessionMeta.mockReturnValue(updated);

    let resolveAutoApprove: (() => void) | null = null;
    let autoApproveSettled = false;
    autoApprovePendingForSession.mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          resolveAutoApprove = () => {
            autoApproveSettled = true;
            resolve(1);
          };
        })
    );

    const result = updateSessionModeAndScheduleAutoApprove({
      sessionId: current.id,
      mode: 'full_access',
      sessionStore: { getSummary, updateSessionMeta },
      modeAuditWriter,
      autoApprovePendingForSession,
      broadcastSessionEvent,
      createEventId: () => 'event-1',
      now: () => 123,
    });

    expect(result).toEqual(updated);
    expect(updateSessionMeta).toHaveBeenCalledWith(current.id, { mode: 'full_access' });
    expect(broadcastSessionEvent).toHaveBeenCalledWith({ type: 'updated', session: updated });
    expect(modeAuditWriter.append).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'event-1',
        sessionId: current.id,
        previousMode: 'ask',
        nextMode: 'full_access',
        timestamp: 123,
      })
    );
    expect(autoApprovePendingForSession).toHaveBeenCalledWith({ sessionId: current.id });
    expect(autoApproveSettled).toBe(false);

    resolveAutoApprove?.();
    await Promise.resolve();
    expect(autoApproveSettled).toBe(true);
    expect(broadcastSessionEvent).toHaveBeenCalledTimes(1);
  });

  it('切到 ask 时不触发自动放行', () => {
    const current = buildSession({ mode: 'full_access' });
    const updated = buildSession({ mode: 'ask', updatedAt: 2 });
    getSummary.mockReturnValue(current);
    updateSessionMeta.mockReturnValue(updated);

    const result = updateSessionModeAndScheduleAutoApprove({
      sessionId: current.id,
      mode: 'ask',
      sessionStore: { getSummary, updateSessionMeta },
      modeAuditWriter,
      autoApprovePendingForSession,
      broadcastSessionEvent,
    });

    expect(result).toEqual(updated);
    expect(autoApprovePendingForSession).not.toHaveBeenCalled();
    expect(broadcastSessionEvent).toHaveBeenCalledWith({ type: 'updated', session: updated });
    expect(modeAuditWriter.append).toHaveBeenCalledTimes(1);
  });

  it('自动放行后台失败时仅记录错误，不影响模式切换返回', async () => {
    const current = buildSession({ mode: 'ask' });
    const updated = buildSession({ mode: 'full_access', updatedAt: 2 });
    getSummary.mockReturnValue(current);
    updateSessionMeta.mockReturnValue(updated);
    autoApprovePendingForSession.mockRejectedValueOnce(new Error('boom'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = updateSessionModeAndScheduleAutoApprove({
      sessionId: current.id,
      mode: 'full_access',
      sessionStore: { getSummary, updateSessionMeta },
      modeAuditWriter,
      autoApprovePendingForSession,
      broadcastSessionEvent,
    });

    expect(result).toEqual(updated);
    await Promise.resolve();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[chat] auto-approve pending approvals failed',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });
});

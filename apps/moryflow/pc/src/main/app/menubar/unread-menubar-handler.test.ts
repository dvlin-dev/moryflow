import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUnreadMenubarHandler } from './unread-menubar-handler.js';

describe('unread-menubar-handler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delete session revision when message event is deleted', () => {
    const deleteSessionRevision = vi.fn();
    const handler = createUnreadMenubarHandler({
      getQuickChatVisibleState: async () => ({ visible: false }),
      isMainWindowVisibleAndFocused: () => false,
      deleteSessionRevision,
      consumeUnreadRevision: vi.fn(() => true),
      incrementUnreadCount: vi.fn(),
    });

    handler({
      type: 'deleted',
      sessionId: 'session-a',
      revision: 1,
    });

    expect(deleteSessionRevision).toHaveBeenCalledWith('session-a');
  });

  it('should not consume unread revision when any window is visible by the time async state resolves', async () => {
    let resolveQuickState: ((value: { visible: boolean }) => void) | null = null;
    let isMainVisible = false;
    const consumeUnreadRevision = vi.fn(() => true);
    const incrementUnreadCount = vi.fn();
    const handler = createUnreadMenubarHandler({
      getQuickChatVisibleState: () =>
        new Promise((resolve) => {
          resolveQuickState = resolve;
        }),
      isMainWindowVisibleAndFocused: () => isMainVisible,
      deleteSessionRevision: vi.fn(),
      consumeUnreadRevision,
      incrementUnreadCount,
    });

    handler({
      type: 'snapshot',
      sessionId: 'session-a',
      revision: 2,
      persisted: true,
    });

    isMainVisible = true;
    resolveQuickState?.({ visible: false });
    await vi.runAllTimersAsync();

    expect(consumeUnreadRevision).not.toHaveBeenCalled();
    expect(incrementUnreadCount).not.toHaveBeenCalled();
  });

  it('should increment unread count only when hidden and revision is fresh', async () => {
    const consumeUnreadRevision = vi.fn(() => true);
    const incrementUnreadCount = vi.fn();
    const handler = createUnreadMenubarHandler({
      getQuickChatVisibleState: async () => ({ visible: false }),
      isMainWindowVisibleAndFocused: () => false,
      deleteSessionRevision: vi.fn(),
      consumeUnreadRevision,
      incrementUnreadCount,
    });

    handler({
      type: 'snapshot',
      sessionId: 'session-a',
      revision: 3,
      persisted: true,
    });
    await vi.runAllTimersAsync();

    expect(consumeUnreadRevision).toHaveBeenCalledWith('session-a', 3);
    expect(incrementUnreadCount).toHaveBeenCalledTimes(1);
  });
});

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DesktopApi } from '@shared/ipc';
import { __resetChatSessionsStoreForTest, useChatSessions } from './use-chat-sessions';

const session = {
  id: 'session-1',
  title: 'New chat',
  updatedAt: Date.now(),
};

describe('useChatSessions', () => {
  beforeEach(() => {
    __resetChatSessionsStoreForTest();
    window.desktopAPI = {
      chat: {
        listSessions: vi.fn().mockResolvedValue([]),
        createSession: vi.fn().mockResolvedValue(session),
        renameSession: vi.fn(),
        deleteSession: vi.fn(),
        onSessionEvent: vi.fn(() => () => {}),
      },
    } as unknown as DesktopApi;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates an initial session when none exist', async () => {
    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(window.desktopAPI.chat.createSession).toHaveBeenCalled();
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.activeSessionId).toBe('session-1');
  });
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessageEvent, DesktopApi } from '@shared/ipc';
import type { UIMessage } from 'ai';
import { useStoredMessages } from './use-stored-messages';

const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    parts: [{ type: 'text', text: 'initial' }],
  },
];

const PUSHED_MESSAGES: UIMessage[] = [
  {
    id: 'm2',
    role: 'assistant',
    parts: [{ type: 'text', text: 'pushed' }],
  },
];

describe('useStoredMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('当前会话收到正文事件后应即时刷新消息（无需切换会话）', async () => {
    let onMessageEventHandler: ((event: ChatMessageEvent) => void) | null = null;
    const disposeMessageListener = vi.fn();
    const setMessages = vi.fn();

    window.desktopAPI = {
      chat: {
        getSessionMessages: vi.fn().mockResolvedValue(INITIAL_MESSAGES),
        onMessageEvent: vi.fn((handler: (event: ChatMessageEvent) => void) => {
          onMessageEventHandler = handler;
          return disposeMessageListener;
        }),
      },
    } as unknown as DesktopApi;

    const { unmount } = renderHook(() =>
      useStoredMessages({
        activeSessionId: 'session_1',
        setMessages,
      })
    );

    await waitFor(() =>
      expect(window.desktopAPI.chat.getSessionMessages).toHaveBeenCalledWith({
        sessionId: 'session_1',
      })
    );

    await waitFor(() => expect(setMessages).toHaveBeenCalledWith(INITIAL_MESSAGES));

    act(() => {
      onMessageEventHandler?.({
        type: 'snapshot',
        sessionId: 'session_1',
        messages: PUSHED_MESSAGES,
        persisted: false,
      });
    });

    expect(window.desktopAPI.chat.onMessageEvent).toHaveBeenCalledTimes(1);
    expect(setMessages).toHaveBeenCalledWith(PUSHED_MESSAGES);

    unmount();
    expect(disposeMessageListener).toHaveBeenCalledTimes(1);
  });
});

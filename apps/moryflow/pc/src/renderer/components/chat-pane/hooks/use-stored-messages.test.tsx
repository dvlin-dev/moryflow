import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessageEvent, ChatSessionMessagesSnapshot, DesktopApi } from '@shared/ipc';
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

const SESSION_2_MESSAGES: UIMessage[] = [
  {
    id: 'm3',
    role: 'assistant',
    parts: [{ type: 'text', text: 'session-2' }],
  },
];

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {
    promise,
    resolve,
    reject,
  };
};

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
        getSessionMessages: vi.fn().mockResolvedValue({
          sessionId: 'session_1',
          messages: INITIAL_MESSAGES,
          revision: 1,
        } satisfies ChatSessionMessagesSnapshot),
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
        revision: 2,
      });
    });

    expect(window.desktopAPI.chat.onMessageEvent).toHaveBeenCalledTimes(1);
    expect(setMessages).toHaveBeenCalledWith(PUSHED_MESSAGES);

    unmount();
    expect(disposeMessageListener).toHaveBeenCalledTimes(1);
  });

  it('初始加载晚于实时事件时，不应被旧快照回滚', async () => {
    let onMessageEventHandler: ((event: ChatMessageEvent) => void) | null = null;
    const initialLoad = createDeferred<ChatSessionMessagesSnapshot>();
    const setMessages = vi.fn();

    window.desktopAPI = {
      chat: {
        getSessionMessages: vi.fn().mockReturnValue(initialLoad.promise),
        onMessageEvent: vi.fn((handler: (event: ChatMessageEvent) => void) => {
          onMessageEventHandler = handler;
          return vi.fn();
        }),
      },
    } as unknown as DesktopApi;

    renderHook(() =>
      useStoredMessages({
        activeSessionId: 'session_1',
        setMessages,
      })
    );

    act(() => {
      onMessageEventHandler?.({
        type: 'snapshot',
        sessionId: 'session_1',
        messages: PUSHED_MESSAGES,
        persisted: false,
        revision: 2,
      });
    });

    initialLoad.resolve({
      sessionId: 'session_1',
      messages: INITIAL_MESSAGES,
      revision: 1,
    });

    await waitFor(() => {
      const latest = setMessages.mock.calls.at(-1)?.[0];
      expect(latest).toEqual(PUSHED_MESSAGES);
    });
  });

  it('已有实时事件后，初始加载失败不应清空当前消息', async () => {
    let onMessageEventHandler: ((event: ChatMessageEvent) => void) | null = null;
    const initialLoad = createDeferred<ChatSessionMessagesSnapshot>();
    const setMessages = vi.fn();

    window.desktopAPI = {
      chat: {
        getSessionMessages: vi.fn().mockReturnValue(initialLoad.promise),
        onMessageEvent: vi.fn((handler: (event: ChatMessageEvent) => void) => {
          onMessageEventHandler = handler;
          return vi.fn();
        }),
      },
    } as unknown as DesktopApi;

    renderHook(() =>
      useStoredMessages({
        activeSessionId: 'session_1',
        setMessages,
      })
    );

    act(() => {
      onMessageEventHandler?.({
        type: 'snapshot',
        sessionId: 'session_1',
        messages: PUSHED_MESSAGES,
        persisted: false,
        revision: 1,
      });
    });

    initialLoad.reject(new Error('load failed'));

    await waitFor(() => {
      const latest = setMessages.mock.calls.at(-1)?.[0];
      expect(latest).toEqual(PUSHED_MESSAGES);
    });
  });

  it('切换会话后，旧会话迟到事件不应污染新会话初始加载', async () => {
    const handlers: Array<(event: ChatMessageEvent) => void> = [];
    const session2Load = createDeferred<ChatSessionMessagesSnapshot>();
    const setMessages = vi.fn();

    window.desktopAPI = {
      chat: {
        getSessionMessages: vi
          .fn()
          .mockResolvedValueOnce({
            sessionId: 'session_1',
            messages: INITIAL_MESSAGES,
            revision: 10,
          } satisfies ChatSessionMessagesSnapshot)
          .mockReturnValueOnce(session2Load.promise),
        onMessageEvent: vi.fn((handler: (event: ChatMessageEvent) => void) => {
          handlers.push(handler);
          return vi.fn();
        }),
      },
    } as unknown as DesktopApi;

    const { rerender } = renderHook(
      ({ activeSessionId }: { activeSessionId?: string | null }) =>
        useStoredMessages({
          activeSessionId,
          setMessages,
        }),
      {
        initialProps: { activeSessionId: 'session_1' as string | null },
      }
    );

    await waitFor(() => {
      const latest = setMessages.mock.calls.at(-1)?.[0];
      expect(latest).toEqual(INITIAL_MESSAGES);
    });

    rerender({ activeSessionId: 'session_2' });

    act(() => {
      handlers[0]?.({
        type: 'snapshot',
        sessionId: 'session_1',
        messages: PUSHED_MESSAGES,
        persisted: false,
        revision: 99,
      });
    });

    session2Load.resolve({
      sessionId: 'session_2',
      messages: SESSION_2_MESSAGES,
      revision: 1,
    });

    await waitFor(() => {
      const latest = setMessages.mock.calls.at(-1)?.[0];
      expect(latest).toEqual(SESSION_2_MESSAGES);
    });
  });
});

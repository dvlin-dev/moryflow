/* @vitest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  ChatGlobalPermissionModeEvent,
  ChatSessionEvent,
  ChatSessionSummary,
  DesktopApi,
} from '@shared/ipc';
import type { TaskState } from '@moryflow/agents-runtime';
import { __resetChatSessionsStoreForTest, useChatSessions } from './use-chat-sessions';

const createSession = (id: string, updatedAt = 1, taskState?: TaskState): ChatSessionSummary => ({
  id,
  title: id,
  createdAt: updatedAt,
  updatedAt,
  vaultPath: '/vault',
  ...(taskState ? { taskState } : {}),
});

describe('useChatSessions', () => {
  let sessionListeners: Set<(event: ChatSessionEvent) => void>;
  let globalModeListeners: Set<(event: ChatGlobalPermissionModeEvent) => void>;
  let disposeSessionListener = vi.fn();
  let disposeGlobalModeListener = vi.fn();

  const emitSessionEvent = (event: ChatSessionEvent) => {
    for (const listener of [...sessionListeners]) {
      listener(event);
    }
  };

  beforeEach(() => {
    __resetChatSessionsStoreForTest();
    sessionListeners = new Set();
    globalModeListeners = new Set();
    disposeSessionListener = vi.fn();
    disposeGlobalModeListener = vi.fn();

    window.desktopAPI = {
      chat: {
        listSessions: vi.fn().mockResolvedValue([createSession('session-a', 1)]),
        createSession: vi.fn().mockResolvedValue(createSession('session-created', 10)),
        renameSession: vi.fn().mockResolvedValue(createSession('session-a', 20)),
        deleteSession: vi.fn().mockResolvedValue({ ok: true }),
        getGlobalMode: vi.fn().mockResolvedValue('ask'),
        setGlobalMode: vi.fn(async ({ mode }) => mode),
        onGlobalModeChanged: vi.fn((handler) => {
          globalModeListeners.add(handler);
          return () => {
            globalModeListeners.delete(handler);
            disposeGlobalModeListener();
          };
        }),
        onSessionEvent: vi.fn((handler) => {
          sessionListeners.add(handler);
          return () => {
            sessionListeners.delete(handler);
            disposeSessionListener();
          };
        }),
      },
    } as unknown as DesktopApi;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps prethread state when none exist', async () => {
    window.desktopAPI.chat.listSessions = vi.fn().mockResolvedValue([]);

    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(window.desktopAPI.chat.getGlobalMode).toHaveBeenCalled();
    expect(window.desktopAPI.chat.createSession).not.toHaveBeenCalled();
    expect(result.current.sessions).toHaveLength(0);
    expect(result.current.selectedSessionId).toBeNull();
    expect(result.current.displaySessionId).toBeNull();
    expect(result.current.isPreThreadOpen).toBe(false);
    expect(result.current.isReady).toBe(true);
  });

  it('openPreThread keeps remembered selection but opens draft display state', async () => {
    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.selectedSessionId).toBeNull();

    act(() => {
      result.current.selectSession('session-a');
    });

    expect(result.current.selectedSessionId).toBe('session-a');
    expect(result.current.displaySessionId).toBe('session-a');
    expect(result.current.isPreThreadOpen).toBe(false);

    act(() => {
      result.current.openPreThread();
    });

    expect(window.desktopAPI.chat.createSession).not.toHaveBeenCalled();
    expect(result.current.selectedSessionId).toBe('session-a');
    expect(result.current.displaySessionId).toBeNull();
    expect(result.current.isPreThreadOpen).toBe(true);
  });

  it('keeps initial hydration running after openPreThread during startup', async () => {
    let resolveGlobalMode!: (value: ChatGlobalPermissionModeEvent['mode']) => void;
    let resolveSessions: ((value: ChatSessionSummary[]) => void) | null = null;
    window.desktopAPI.chat.getGlobalMode = vi.fn<
      () => Promise<ChatGlobalPermissionModeEvent['mode']>
    >(
      () =>
        new Promise((resolve) => {
          resolveGlobalMode = resolve;
        })
    );
    window.desktopAPI.chat.listSessions = vi.fn<() => Promise<ChatSessionSummary[]>>(
      () =>
        new Promise((resolve) => {
          resolveSessions = resolve;
        })
    );

    const { result } = renderHook(() => useChatSessions());

    act(() => {
      result.current.openPreThread();
    });

    expect(result.current.isPreThreadOpen).toBe(true);
    expect(result.current.isReady).toBe(false);

    await act(async () => {
      resolveGlobalMode('ask');
      await Promise.resolve();
    });

    await waitFor(() => expect(window.desktopAPI.chat.listSessions).toHaveBeenCalledTimes(1));
    expect(resolveSessions).not.toBeNull();

    await act(async () => {
      resolveSessions?.([createSession('session-a', 1)]);
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(window.desktopAPI.chat.getGlobalMode).toHaveBeenCalledTimes(1);
    expect(window.desktopAPI.chat.listSessions).toHaveBeenCalledTimes(1);
    expect(result.current.sessions.map((item) => item.id)).toEqual(['session-a']);
    expect(result.current.isPreThreadOpen).toBe(true);
  });

  it('disposes the session listener when the last subscriber unmounts', async () => {
    const { result, unmount } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    unmount();
    expect(disposeSessionListener).toHaveBeenCalledTimes(1);
    expect(disposeGlobalModeListener).toHaveBeenCalledTimes(1);
  });

  it('keeps the session listener while there are active subscribers', async () => {
    const hook1 = renderHook(() => useChatSessions());
    const hook2 = renderHook(() => useChatSessions());

    await waitFor(() => expect(hook1.result.current.isReady).toBe(true));
    await waitFor(() => expect(hook2.result.current.isReady).toBe(true));

    hook1.unmount();
    expect(disposeSessionListener).not.toHaveBeenCalled();
    expect(disposeGlobalModeListener).not.toHaveBeenCalled();

    hook2.unmount();
    expect(disposeSessionListener).toHaveBeenCalledTimes(1);
    expect(disposeGlobalModeListener).toHaveBeenCalledTimes(1);
  });

  it('propagates updated session taskState to the active session snapshot', async () => {
    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.displaySessionId).toBeNull();
    expect(result.current.activeSession?.taskState).toBeUndefined();

    act(() => {
      result.current.selectSession('session-a');
    });

    const nextTaskState: TaskState = {
      updatedAt: 100,
      items: [
        { id: 'task-1', title: 'Keep event bridge', status: 'in_progress' },
        { id: 'task-2', title: 'Render active snapshot', status: 'todo' },
      ],
    };

    act(() => {
      emitSessionEvent({
        type: 'updated',
        session: createSession('session-a', 2, nextTaskState),
      });
    });

    await waitFor(() => expect(result.current.activeSession?.taskState).toEqual(nextTaskState));
  });

  it('keeps startup in prethread even when history exists', async () => {
    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.sessions.map((item) => item.id)).toEqual(['session-a']);
    expect(result.current.selectedSessionId).toBeNull();
    expect(result.current.displaySessionId).toBeNull();
    expect(result.current.activeSession).toBeNull();
    expect(result.current.isPreThreadOpen).toBe(false);
  });

  it('treats created sessions as event-driven state and only updates active selection locally', async () => {
    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.sessions.map((item) => item.id)).toEqual(['session-a']);

    await act(async () => {
      await result.current.createSession();
    });

    expect(result.current.selectedSessionId).toBe('session-created');
    expect(result.current.displaySessionId).toBe('session-created');
    expect(result.current.isPreThreadOpen).toBe(false);
    expect(result.current.sessions.map((item) => item.id)).toEqual(['session-a']);

    act(() => {
      emitSessionEvent({
        type: 'created',
        session: createSession('session-created', 10),
      });
    });

    await waitFor(() =>
      expect(result.current.sessions.map((item) => item.id)).toEqual([
        'session-created',
        'session-a',
      ])
    );
  });

  it('keeps session snapshots unchanged until a rename updated event arrives', async () => {
    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.sessions[0]?.title).toBe('session-a');

    await act(async () => {
      await result.current.renameSession('session-a', 'Renamed');
    });

    expect(window.desktopAPI.chat.renameSession).toHaveBeenCalledWith({
      sessionId: 'session-a',
      title: 'Renamed',
    });
    expect(result.current.sessions[0]?.title).toBe('session-a');

    act(() => {
      emitSessionEvent({
        type: 'updated',
        session: {
          ...createSession('session-a', 3),
          title: 'Renamed',
        },
      });
    });

    await waitFor(() => expect(result.current.sessions[0]?.title).toBe('Renamed'));
  });

  it('keeps session snapshots unchanged until a delete event arrives', async () => {
    window.desktopAPI.chat.listSessions = vi
      .fn()
      .mockResolvedValue([createSession('session-a', 1), createSession('session-b', 2)]);

    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => {
      result.current.selectSession('session-b');
    });
    expect(result.current.displaySessionId).toBe('session-b');

    await act(async () => {
      await result.current.deleteSession('session-b');
    });

    expect(window.desktopAPI.chat.deleteSession).toHaveBeenCalledWith({ sessionId: 'session-b' });
    expect(result.current.sessions.map((item) => item.id)).toEqual(['session-b', 'session-a']);
    expect(result.current.displaySessionId).toBe('session-b');

    act(() => {
      emitSessionEvent({ type: 'deleted', sessionId: 'session-b' });
    });

    await waitFor(() => expect(result.current.displaySessionId).toBe('session-a'));
    expect(result.current.sessions.map((item) => item.id)).toEqual(['session-a']);
  });

  it('closes draft when selecting a thread after opening prethread', async () => {
    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => {
      result.current.openPreThread();
    });

    expect(result.current.isPreThreadOpen).toBe(true);
    expect(result.current.displaySessionId).toBeNull();

    act(() => {
      result.current.selectSession('session-a');
    });

    expect(result.current.isPreThreadOpen).toBe(false);
    expect(result.current.selectedSessionId).toBe('session-a');
    expect(result.current.displaySessionId).toBe('session-a');
  });

  it('rejects delete failures so the UI can handle them explicitly', async () => {
    window.desktopAPI.chat.deleteSession = vi
      .fn()
      .mockRejectedValueOnce(new Error('delete failed'));

    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    await expect(result.current.deleteSession('session-a')).rejects.toThrow('delete failed');
  });
});

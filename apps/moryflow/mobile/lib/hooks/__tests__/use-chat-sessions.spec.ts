/* @vitest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatSessionSummary, TaskState } from '@moryflow/agents-runtime';

const runtimeMock = vi.hoisted(() => {
  const listeners = new Set<(event: unknown) => void>();
  return {
    listeners,
    getSessions: vi.fn(),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    renameSession: vi.fn(),
    onSessionEvent: vi.fn((listener: (event: unknown) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    getGlobalPermissionMode: vi.fn(),
    setGlobalPermissionMode: vi.fn(),
    recordModeSwitch: vi.fn(),
  };
});

vi.mock('@/lib/agent-runtime', () => ({
  getSessions: runtimeMock.getSessions,
  createSession: runtimeMock.createSession,
  deleteSession: runtimeMock.deleteSession,
  renameSession: runtimeMock.renameSession,
  onSessionEvent: runtimeMock.onSessionEvent,
  getGlobalPermissionMode: runtimeMock.getGlobalPermissionMode,
  setGlobalPermissionMode: runtimeMock.setGlobalPermissionMode,
  recordModeSwitch: runtimeMock.recordModeSwitch,
}));

vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => 'uuid-1'),
}));

import { buildTaskSheetRows } from '../../../components/chat/tasks-sheet-model';
import { resolveActiveSessionId } from '../session-selection';
import { useChatSessions } from '../use-chat-sessions';

const createSession = (id: string, updatedAt = 1, taskState?: TaskState): ChatSessionSummary => ({
  id,
  title: id,
  createdAt: updatedAt,
  updatedAt,
  ...(taskState ? { taskState } : {}),
});

const emitSessionEvent = (event: unknown) => {
  for (const listener of runtimeMock.listeners) {
    listener(event);
  }
};

describe('resolveActiveSessionId', () => {
  it('picks the first session when there is no active session yet', () => {
    expect(
      resolveActiveSessionId(null, [createSession('session-a'), createSession('session-b')])
    ).toBe('session-a');
  });

  it('falls back to the first session when the current active session disappeared', () => {
    expect(
      resolveActiveSessionId('missing', [createSession('session-a'), createSession('session-b')])
    ).toBe('session-a');
  });

  it('keeps the current active session when it still exists', () => {
    expect(
      resolveActiveSessionId('session-b', [createSession('session-a'), createSession('session-b')])
    ).toBe('session-b');
  });

  it('returns null when there are no sessions', () => {
    expect(resolveActiveSessionId('session-a', [])).toBeNull();
  });
});

describe('useChatSessions taskState integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeMock.listeners.clear();
    runtimeMock.getSessions.mockResolvedValue([createSession('session-a', 1)]);
    runtimeMock.getGlobalPermissionMode.mockResolvedValue('ask');
    runtimeMock.createSession.mockResolvedValue(createSession('session-created', 10));
    runtimeMock.deleteSession.mockResolvedValue(undefined);
    runtimeMock.renameSession.mockResolvedValue(undefined);
    runtimeMock.setGlobalPermissionMode.mockResolvedValue({ mode: 'ask' });
    runtimeMock.recordModeSwitch.mockResolvedValue(undefined);
  });

  it('propagates updated session taskState to the active checklist rows', async () => {
    const { result } = renderHook(() => {
      const state = useChatSessions();
      return {
        isReady: state.isReady,
        activeSessionId: state.activeSessionId,
        activeTaskState: state.activeSession?.taskState,
        rows: buildTaskSheetRows(state.activeSession?.taskState),
      };
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.activeSessionId).toBe('session-a');
    expect(result.current.rows).toEqual([]);

    const nextTaskState: TaskState = {
      updatedAt: 100,
      items: [
        { id: 'task-1', title: 'Keep stream safe', status: 'in_progress' },
        { id: 'task-2', title: 'Delete session after stop', status: 'todo' },
      ],
    };

    act(() => {
      emitSessionEvent({
        type: 'updated',
        session: createSession('session-a', 2, nextTaskState),
      });
    });

    await waitFor(() => expect(result.current.activeTaskState).toEqual(nextTaskState));
    expect(result.current.rows).toEqual([
      { id: 'task-1', title: 'Keep stream safe', status: 'in_progress' },
      { id: 'task-2', title: 'Delete session after stop', status: 'todo' },
    ]);
  });

  it('treats created sessions as event-driven state and only updates active selection locally', async () => {
    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => {
      await result.current.createSession('Created');
    });

    expect(result.current.activeSessionId).toBe('session-created');
    expect(result.current.sessions.map((session) => session.id)).toEqual(['session-a']);
  });

  it('keeps session snapshots unchanged until a rename updated event arrives', async () => {
    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => {
      await result.current.renameSession('session-a', 'Renamed');
    });

    expect(result.current.sessions[0]?.title).toBe('session-a');
  });

  it('keeps session snapshots unchanged until a delete event arrives', async () => {
    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => {
      await result.current.deleteSession('session-a');
    });

    expect(result.current.activeSessionId).toBe('session-a');
    expect(result.current.sessions.map((session) => session.id)).toEqual(['session-a']);
  });

  it('rejects delete failures so the UI lifecycle helper can react explicitly', async () => {
    runtimeMock.deleteSession.mockRejectedValueOnce(new Error('delete failed'));
    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    await expect(result.current.deleteSession('session-a')).rejects.toThrow('delete failed');
  });

  it('falls back to the next available session when the active session is deleted by event', async () => {
    runtimeMock.getSessions.mockResolvedValue([
      createSession('session-a', 2),
      createSession('session-b', 1),
    ]);
    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => {
      result.current.selectSession('session-b');
    });
    expect(result.current.activeSessionId).toBe('session-b');

    act(() => {
      emitSessionEvent({ type: 'deleted', sessionId: 'session-b' });
    });

    await waitFor(() => expect(result.current.activeSessionId).toBe('session-a'));
    expect(result.current.activeSession?.id).toBe('session-a');
  });
});

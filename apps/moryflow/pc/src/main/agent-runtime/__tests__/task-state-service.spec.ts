/* @vitest-environment node */
import { describe, expect, it, vi } from 'vitest';
import type { ChatSessionSummary } from '../../../shared/ipc.js';
import type { TaskState } from '@moryflow/agents-runtime';
vi.mock('@moryflow/agents-tools', () => {
  const EMPTY_TASK_STATE = { items: [], updatedAt: 0 } as const;
  return {
    EMPTY_TASK_STATE,
    normalizeTaskState: (
      current: TaskState | undefined,
      items: Array<{
        id?: string;
        title: string;
        status: 'todo' | 'in_progress' | 'done';
        note?: string;
      }>,
      options: { now: () => number; createId: () => string }
    ) => {
      const normalized = items.map((item) => ({
        id: item.id ?? options.createId(),
        title: item.title.trim(),
        status: item.status,
        ...(item.note ? { note: item.note } : {}),
      }));
      if (
        current &&
        current.items.length === normalized.length &&
        current.items.every((item, index) => {
          const next = normalized[index];
          return (
            item.id === next?.id &&
            item.title === next?.title &&
            item.status === next?.status &&
            item.note === next?.note
          );
        })
      ) {
        return current;
      }
      return { items: normalized, updatedAt: options.now() };
    },
    clearDoneTaskState: (current: TaskState | undefined, now: () => number) => {
      const state = current ?? EMPTY_TASK_STATE;
      const items = state.items.filter((item) => item.status !== 'done');
      if (items.length === state.items.length) {
        return state;
      }
      return { items, updatedAt: now() };
    },
  };
});
vi.mock('../../chat/broadcast.js', () => ({
  broadcastSessionEvent: vi.fn(),
}));
vi.mock('../../chat-session-store/index.js', () => ({
  chatSessionStore: {
    getSummary: vi.fn(),
    setTaskState: vi.fn(),
  },
}));
import { EMPTY_TASK_STATE } from '@moryflow/agents-tools';
import { createDesktopTaskStateService } from '../task-state-service.js';

type SummaryMap = Map<string, ChatSessionSummary>;

const createSummary = (sessionId: string, taskState?: TaskState): ChatSessionSummary => ({
  id: sessionId,
  title: 'Test',
  createdAt: 1,
  updatedAt: 1,
  vaultPath: '/vault',
  ...(taskState ? { taskState } : {}),
});

const createHarness = (initial?: SummaryMap) => {
  const summaries = initial ?? new Map<string, ChatSessionSummary>();
  const emitted: ChatSessionSummary[] = [];

  const service = createDesktopTaskStateService({
    now: () => 200,
    createId: (() => {
      let index = 0;
      return () => `task_${++index}`;
    })(),
    store: {
      getSummary(chatId) {
        const summary = summaries.get(chatId);
        if (!summary) {
          throw new Error(`missing session: ${chatId}`);
        }
        return summary;
      },
      setTaskState(chatId, taskState) {
        const current = summaries.get(chatId);
        if (!current) {
          throw new Error(`missing session: ${chatId}`);
        }
        const next = {
          ...current,
          updatedAt: taskState ? taskState.updatedAt : current.updatedAt,
          taskState,
        };
        summaries.set(chatId, next);
        return next;
      },
    },
    emitSessionUpdated(session) {
      emitted.push(session);
    },
  });

  return { service, summaries, emitted };
};

describe('createDesktopTaskStateService', () => {
  it('returns empty snapshot when session has no taskState', async () => {
    const { service } = createHarness(new Map([['chat-a', createSummary('chat-a')]]));

    await expect(service.get('chat-a')).resolves.toEqual(EMPTY_TASK_STATE);
  });

  it('set keeps updatedAt on no-op and does not emit session update', async () => {
    const taskState: TaskState = {
      items: [{ id: 'task-1', title: 'Keep', status: 'todo' }],
      updatedAt: 111,
    };
    const { service, emitted } = createHarness(
      new Map([['chat-a', createSummary('chat-a', taskState)]])
    );

    const result = await service.set('chat-a', [{ id: 'task-1', title: 'Keep', status: 'todo' }]);

    expect(result).toEqual(taskState);
    expect(result.updatedAt).toBe(111);
    expect(emitted).toEqual([]);
  });

  it('clearDone removes done items, keeps order, and emits updated summary', async () => {
    const taskState: TaskState = {
      items: [
        { id: 'done-1', title: 'Done 1', status: 'done' },
        { id: 'doing', title: 'Doing', status: 'in_progress' },
        { id: 'todo', title: 'Todo', status: 'todo' },
        { id: 'done-2', title: 'Done 2', status: 'done' },
      ],
      updatedAt: 111,
    };
    const { service, emitted, summaries } = createHarness(
      new Map([['chat-a', createSummary('chat-a', taskState)]])
    );

    const result = await service.clearDone('chat-a');

    expect(result).toEqual({
      items: [
        { id: 'doing', title: 'Doing', status: 'in_progress' },
        { id: 'todo', title: 'Todo', status: 'todo' },
      ],
      updatedAt: 200,
    });
    expect(summaries.get('chat-a')?.taskState).toEqual(result);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.taskState).toEqual(result);
  });

  it('fails if the session disappears between read and persist', async () => {
    const taskState: TaskState = {
      items: [{ id: 'task-1', title: 'Keep', status: 'todo' }],
      updatedAt: 111,
    };
    let deleted = false;
    const service = createDesktopTaskStateService({
      now: () => 200,
      createId: () => 'task_1',
      store: {
        getSummary(chatId) {
          if (deleted) {
            throw new Error(`missing session: ${chatId}`);
          }
          return createSummary(chatId, taskState);
        },
        setTaskState(chatId) {
          deleted = true;
          throw new Error(`missing session: ${chatId}`);
        },
      },
    });

    await expect(service.set('chat-a', [{ title: 'Changed', status: 'todo' }])).rejects.toThrow(
      'missing session: chat-a'
    );
  });
});

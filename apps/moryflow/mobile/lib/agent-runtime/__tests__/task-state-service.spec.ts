import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const storage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      for (const key of keys) {
        storage.delete(key);
      }
    }),
  },
}));

vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => 'session-1'),
}));

import { mobileSessionStore, onSessionEvent } from '../session-store';
import { createMobileTaskStateService } from '../task-state-service';

describe('mobile task state session integration', () => {
  beforeEach(async () => {
    storage.clear();
    await mobileSessionStore.clearAll();
  });

  it('persists taskState in session summaries and emits updated event', async () => {
    const created = await mobileSessionStore.createSession('Test');
    const events: Array<{ type: string; sessionId?: string; taskState?: TaskState }> = [];
    const dispose = onSessionEvent((event) => {
      events.push({
        type: event.type,
        sessionId: event.type === 'deleted' ? event.sessionId : event.session.id,
        taskState: event.type === 'deleted' ? undefined : event.session.taskState,
      });
    });

    const taskState: TaskState = {
      items: [{ id: 'task-1', title: 'Write docs', status: 'in_progress' }],
      updatedAt: 100,
    };
    await mobileSessionStore.setTaskState(created.id, taskState);

    const stored = await mobileSessionStore.getSession(created.id);
    const sessions = await mobileSessionStore.getSessions();
    dispose();

    expect(stored?.taskState).toEqual(taskState);
    expect(sessions[0]?.taskState).toEqual(taskState);
    expect(events).toContainEqual({
      type: 'updated',
      sessionId: created.id,
      taskState,
    });
  });

  it('service get/set/clearDone follows the shared snapshot contract', async () => {
    const created = await mobileSessionStore.createSession('Test');
    const service = createMobileTaskStateService({
      store: mobileSessionStore,
      now: () => 200,
      createId: (() => {
        let index = 0;
        return () => `task_${++index}`;
      })(),
    });

    await expect(service.get(created.id)).resolves.toEqual({
      items: [],
      updatedAt: 0,
    });

    const next = await service.set(created.id, [
      { title: 'Done 1', status: 'done' },
      { title: 'Doing', status: 'in_progress' },
      { title: 'Todo', status: 'todo' },
    ]);

    expect(next).toEqual({
      items: [
        { id: 'task_1', title: 'Done 1', status: 'done' },
        { id: 'task_2', title: 'Doing', status: 'in_progress' },
        { id: 'task_3', title: 'Todo', status: 'todo' },
      ],
      updatedAt: 200,
    });

    const cleared = await service.clearDone(created.id);

    expect(cleared).toEqual({
      items: [
        { id: 'task_2', title: 'Doing', status: 'in_progress' },
        { id: 'task_3', title: 'Todo', status: 'todo' },
      ],
      updatedAt: 200,
    });
    await expect(service.get(created.id)).resolves.toEqual(cleared);
  });

  it('fails when the session is deleted before taskState persistence completes', async () => {
    const created = await mobileSessionStore.createSession('Test');
    const service = createMobileTaskStateService({
      store: {
        getSession: (chatId) => mobileSessionStore.getSession(chatId),
        async setTaskState(chatId, taskState) {
          await mobileSessionStore.deleteSession(chatId);
          return mobileSessionStore.setTaskState(chatId, taskState);
        },
      },
      now: () => 200,
      createId: () => 'task_1',
    });

    await expect(
      service.set(created.id, [{ title: 'Write docs', status: 'todo' }])
    ).rejects.toThrow(`missing session: ${created.id}`);
    await expect(mobileSessionStore.getSession(created.id)).resolves.toBeNull();
  });
});

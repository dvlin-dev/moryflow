import { describe, expect, it } from 'vitest';
import { RunContext } from '@openai/agents-core';
import type { AgentContext } from '@moryflow/agents-runtime';
import { createTaskTool } from '../src/task/task-tool';
import {
  EMPTY_TASK_STATE,
  type TaskItemInput,
  type TaskState,
  type TaskStateService,
  normalizeTaskState,
} from '../src/task/task-state';

const createMemoryTaskStateService = (
  initial?: Partial<Record<string, TaskState>>
): TaskStateService => {
  const state = new Map<string, TaskState>(Object.entries(initial ?? {}));
  let generatedId = 0;

  return {
    async get(chatId) {
      return state.get(chatId) ?? EMPTY_TASK_STATE;
    },
    async set(chatId, items) {
      const current = state.get(chatId);
      const next = normalizeTaskState(current, items, {
        now: () => 1000,
        createId: () => `tsk_${++generatedId}`,
      });
      state.set(chatId, next);
      return next;
    },
    async clearDone(chatId) {
      const current = state.get(chatId) ?? EMPTY_TASK_STATE;
      const nextItems = current.items.filter((item) => item.status !== 'done');
      if (nextItems.length === current.items.length) {
        return current;
      }
      const next = { items: nextItems, updatedAt: 2000 };
      state.set(chatId, next);
      return next;
    },
  };
};

describe('createTaskTool', () => {
  it('keeps EMPTY_TASK_STATE deeply immutable', () => {
    expect(Object.isFrozen(EMPTY_TASK_STATE)).toBe(true);
    expect(Object.isFrozen(EMPTY_TASK_STATE.items)).toBe(true);
    expect(() =>
      EMPTY_TASK_STATE.items.push({ id: 'x', title: 'Mutate', status: 'todo' })
    ).toThrow();
  });

  it('returns the canonical empty snapshot when normalizing an empty list without prior state', () => {
    const result = normalizeTaskState(undefined, [], {
      now: () => 1000,
      createId: () => 'tsk_1',
    });

    expect(result).toBe(EMPTY_TASK_STATE);
  });

  it('passes chatId from runContext into service calls', async () => {
    const calls: string[] = [];
    const service: TaskStateService = {
      async get(chatId) {
        calls.push(chatId);
        return EMPTY_TASK_STATE;
      },
      async set() {
        throw new Error('not_implemented');
      },
      async clearDone() {
        throw new Error('not_implemented');
      },
    };

    const tool = createTaskTool(service);
    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot: '/vault' });

    const result = await tool.invoke(context, JSON.stringify({ action: 'get' }));

    expect(calls).toEqual(['chat-a']);
    expect(result).toEqual(EMPTY_TASK_STATE);
  });

  it('returns an empty snapshot when task state does not exist', async () => {
    const tool = createTaskTool(createMemoryTaskStateService());
    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot: '/vault' });

    const result = await tool.invoke(context, JSON.stringify({ action: 'get' }));

    expect(result).toEqual(EMPTY_TASK_STATE);
  });

  it('normalizes ids on set and returns the full snapshot', async () => {
    const tool = createTaskTool(createMemoryTaskStateService());
    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot: '/vault' });

    const result = (await tool.invoke(
      context,
      JSON.stringify({
        action: 'set',
        items: [
          { title: 'First', status: 'done' },
          { id: 'custom', title: 'Second', status: 'in_progress', note: 'working' },
        ] satisfies TaskItemInput[],
      })
    )) as TaskState;

    expect(result).toEqual({
      items: [
        { id: 'tsk_1', title: 'First', status: 'done' },
        { id: 'custom', title: 'Second', status: 'in_progress', note: 'working' },
      ],
      updatedAt: 1000,
    });
  });

  it('rejects duplicate ids as validation_error', async () => {
    const tool = createTaskTool(createMemoryTaskStateService());
    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot: '/vault' });

    const result = (await tool.invoke(
      context,
      JSON.stringify({
        action: 'set',
        items: [
          { id: 'dup', title: 'A', status: 'todo' },
          { id: 'dup', title: 'B', status: 'done' },
        ],
      })
    )) as { error: string; message: string };

    expect(result.error).toBe('validation_error');
    expect(result.message).toContain('duplicate');
  });

  it('rejects more than 8 tasks as validation_error', async () => {
    const tool = createTaskTool(createMemoryTaskStateService());
    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot: '/vault' });

    const items = Array.from({ length: 9 }, (_, index) => ({
      title: `Task ${index + 1}`,
      status: 'todo' as const,
    }));
    const result = (await tool.invoke(context, JSON.stringify({ action: 'set', items }))) as {
      error: string;
      message: string;
    };

    expect(result.error).toBe('validation_error');
    expect(result.message).toContain('at most 8');
  });

  it('rejects more than one in_progress item as validation_error', async () => {
    const tool = createTaskTool(createMemoryTaskStateService());
    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot: '/vault' });

    const result = (await tool.invoke(
      context,
      JSON.stringify({
        action: 'set',
        items: [
          { title: 'A', status: 'in_progress' },
          { title: 'B', status: 'in_progress' },
        ],
      })
    )) as { error: string; message: string };

    expect(result.error).toBe('validation_error');
    expect(result.message).toContain('in_progress');
  });

  it('rejects empty titles as validation_error', async () => {
    const tool = createTaskTool(createMemoryTaskStateService());
    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot: '/vault' });

    const result = (await tool.invoke(
      context,
      JSON.stringify({
        action: 'set',
        items: [{ title: '   ', status: 'todo' }],
      })
    )) as { error: string; message: string };

    expect(result.error).toBe('validation_error');
    expect(result.message).toContain('title');
  });

  it('maps non-validation failures to runtime_error', async () => {
    const service: TaskStateService = {
      async get() {
        throw new Error('db unavailable');
      },
      async set() {
        throw new Error('not_implemented');
      },
      async clearDone() {
        throw new Error('not_implemented');
      },
    };
    const tool = createTaskTool(service);
    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot: '/vault' });

    const result = (await tool.invoke(context, JSON.stringify({ action: 'get' }))) as {
      error: string;
      message: string;
    };

    expect(result.error).toBe('runtime_error');
    expect(result.message).toContain('db unavailable');
  });

  it('clear_done removes only done items and keeps remaining order', async () => {
    const tool = createTaskTool(
      createMemoryTaskStateService({
        'chat-a': {
          items: [
            { id: 'one', title: 'One', status: 'done' },
            { id: 'two', title: 'Two', status: 'in_progress' },
            { id: 'three', title: 'Three', status: 'todo' },
            { id: 'four', title: 'Four', status: 'done' },
          ],
          updatedAt: 1000,
        },
      })
    );
    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot: '/vault' });

    const result = (await tool.invoke(
      context,
      JSON.stringify({ action: 'clear_done' })
    )) as TaskState;

    expect(result).toEqual({
      items: [
        { id: 'two', title: 'Two', status: 'in_progress' },
        { id: 'three', title: 'Three', status: 'todo' },
      ],
      updatedAt: 2000,
    });
  });

  it('maps task contract input errors to validation_error instead of leaking InvalidToolInputError', async () => {
    const tool = createTaskTool(createMemoryTaskStateService());
    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot: '/vault' });

    await expect(tool.invoke(context, JSON.stringify({ action: 'set' }))).resolves.toEqual({
      error: 'validation_error',
      message: 'items is required when action is set',
    });
    await expect(
      tool.invoke(context, JSON.stringify({ action: 'get', items: [] }))
    ).resolves.toEqual({
      error: 'validation_error',
      message: 'items is only allowed when action is set',
    });
    await expect(tool.invoke(context, JSON.stringify({ action: 'oops' }))).resolves.toEqual({
      error: 'validation_error',
      message: 'action must be one of get, set, clear_done',
    });
  });

  it('keeps updatedAt stable when the same checklist is set again without explicit ids', async () => {
    const tool = createTaskTool(createMemoryTaskStateService());
    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot: '/vault' });

    const first = (await tool.invoke(
      context,
      JSON.stringify({
        action: 'set',
        items: [{ title: 'Same task', status: 'todo' } satisfies TaskItemInput],
      })
    )) as TaskState;

    const second = (await tool.invoke(
      context,
      JSON.stringify({
        action: 'set',
        items: [{ title: 'Same task', status: 'todo' } satisfies TaskItemInput],
      })
    )) as TaskState;

    expect(second).toBe(first);
    expect(second).toEqual({
      items: [{ id: 'tsk_1', title: 'Same task', status: 'todo' }],
      updatedAt: 1000,
    });
  });
});

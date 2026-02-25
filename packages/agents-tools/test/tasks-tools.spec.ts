import { describe, expect, it } from 'vitest';
import { RunContext } from '@openai/agents-core';
import { createTasksTools } from '../src/task/tasks-tools';
import { normalizeToolSchemasForInterop } from '@moryflow/agents-runtime';
import type {
  TasksStore,
  TasksStoreContext,
  TaskRecord,
  TaskDependency,
  TaskNote,
  TaskFile,
} from '../src/task/tasks-store';
import type { AgentContext } from '@moryflow/agents-runtime';

const createMockStore = (overrides: Partial<TasksStore> = {}): TasksStore => {
  const noop = async () => {};
  const notFound = async () => null;
  return {
    init: async (_context: TasksStoreContext) => {},
    listTasks: async (_chatId: string) => [],
    getTask: notFound,
    createTask: async (_chatId) => {
      throw new Error('not_implemented');
    },
    updateTask: async (_chatId, _taskId) => {
      throw new Error('not_implemented');
    },
    setStatus: async (_chatId, _taskId) => {
      throw new Error('not_implemented');
    },
    addDependency: noop,
    removeDependency: noop,
    listDependencies: async (_chatId, _taskId) => [],
    addNote: async () => {
      throw new Error('not_implemented');
    },
    listNotes: async () => [],
    addFiles: noop,
    listFiles: async () => [],
    deleteTask: noop,
    ...overrides,
  };
};

describe('createTasksTools', () => {
  it('passes chatId from runContext into store calls', async () => {
    const calls: { init?: TasksStoreContext; list?: { chatId: string } } = {};
    const store = createMockStore({
      init: async (context) => {
        calls.init = context;
      },
      listTasks: async (chatId) => {
        calls.list = { chatId };
        return [];
      },
    });
    const tools = createTasksTools(store);
    const listTool = tools.find((tool) => tool.name === 'tasks_list');
    if (!listTool) {
      throw new Error('tasks_list_not_found');
    }

    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot: '/vault' });
    await listTool.invoke(context, JSON.stringify({}));

    expect(calls.init?.vaultRoot).toBe('/vault');
    expect(calls.list?.chatId).toBe('chat-a');
  });

  it('renders safe mermaid node ids in tasks_graph', async () => {
    const tasks: TaskRecord[] = [
      {
        id: 'tsk_a-b',
        chatId: 'chat-a',
        title: 'Task A',
        description: '',
        status: 'todo',
        priority: 'p1',
        owner: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        version: 1,
      },
      {
        id: 'tsk_c-d',
        chatId: 'chat-a',
        title: 'Task B',
        description: '',
        status: 'todo',
        priority: 'p1',
        owner: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        version: 1,
      },
    ];
    const dependencies: Record<string, TaskDependency[]> = {
      'tsk_c-d': [{ chatId: 'chat-a', taskId: 'tsk_c-d', dependsOn: 'tsk_a-b' }],
    };
    const store = createMockStore({
      listTasks: async () => tasks,
      listDependencies: async (_chatId, taskId) => dependencies[taskId] ?? [],
      listNotes: async () => [] as TaskNote[],
      listFiles: async () => [] as TaskFile[],
    });
    const tools = createTasksTools(store);
    const graphTool = tools.find((tool) => tool.name === 'tasks_graph');
    if (!graphTool) {
      throw new Error('tasks_graph_not_found');
    }

    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot: '/vault' });
    const result = (await graphTool.invoke(context, JSON.stringify({}))) as { mermaid: string };

    expect(result.mermaid).toContain('graph TD');
    expect(result.mermaid).not.toContain('tsk_a-b');
    expect(result.mermaid).not.toContain('tsk_c-d');
  });

  it('sanitizes mermaid labels for tasks_graph', async () => {
    const tasks: TaskRecord[] = [
      {
        id: 'tsk_label',
        chatId: 'chat-a',
        title: 'Bad "title" [x] | y\nz',
        description: '',
        status: 'todo',
        priority: 'p1',
        owner: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        version: 1,
      },
    ];
    const store = createMockStore({
      listTasks: async () => tasks,
      listDependencies: async () => [],
      listNotes: async () => [] as TaskNote[],
      listFiles: async () => [] as TaskFile[],
    });
    const tools = createTasksTools(store);
    const graphTool = tools.find((tool) => tool.name === 'tasks_graph');
    if (!graphTool) {
      throw new Error('tasks_graph_not_found');
    }

    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot: '/vault' });
    const result = (await graphTool.invoke(context, JSON.stringify({}))) as { mermaid: string };

    const labelLine = result.mermaid.split('\n').find((line) => line.includes('["'));
    const match = labelLine?.match(/\["(.*)"\]/);
    expect(match?.[1]).toBeDefined();
    const label = match?.[1] ?? '';
    expect(label).not.toContain('"');
    expect(label).not.toContain('[');
    expect(label).not.toContain(']');
    expect(label).not.toContain('|');
    expect(label).not.toContain('\\n');
  });

  it('requires confirm=true for tasks_delete', async () => {
    let deleteCalled = false;
    const store = createMockStore({
      deleteTask: async () => {
        deleteCalled = true;
      },
    });
    const tools = createTasksTools(store);
    const deleteTool = tools.find((tool) => tool.name === 'tasks_delete');
    if (!deleteTool) {
      throw new Error('tasks_delete_not_found');
    }

    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot: '/vault' });
    const result = (await deleteTool.invoke(
      context,
      JSON.stringify({ taskId: 'tsk_1', confirm: false })
    )) as { error?: string };

    expect(result.error).toBe('confirm_required');
    expect(deleteCalled).toBe(false);
  });

  it('normalizes tasks_list status enum schema for strict providers', () => {
    const store = createMockStore();
    const tools = createTasksTools(store);
    const normalizedTools = normalizeToolSchemasForInterop(tools);
    const listTool = normalizedTools.find((tool) => tool.name === 'tasks_list');
    if (!listTool || listTool.type !== 'function') {
      throw new Error('tasks_list_not_found');
    }

    const parameters = listTool.parameters as Record<string, unknown>;
    const properties = parameters.properties as Record<string, unknown>;
    const status = properties.status as Record<string, unknown>;
    const statusAnyOf = status.anyOf as unknown[] | undefined;
    const statusItems = ((status.items as Record<string, unknown> | undefined) ??
      (
        (statusAnyOf ?? []).find(
          (candidate) =>
            typeof candidate === 'object' &&
            candidate !== null &&
            'items' in (candidate as Record<string, unknown>)
        ) as Record<string, unknown> | undefined
      )?.items) as Record<string, unknown> | undefined;
    if (!statusItems) {
      throw new Error('tasks_list_status_items_not_found');
    }

    const enumValues = statusItems.enum as unknown[];
    expect(Array.isArray(enumValues)).toBe(true);
    expect(enumValues).toContain('todo');
    const enumType = statusItems.type;
    if (Array.isArray(enumType)) {
      expect(enumType).toContain('string');
      return;
    }
    expect(enumType).toBe('string');
  });
});

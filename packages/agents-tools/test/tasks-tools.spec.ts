import { describe, expect, it } from 'vitest';
import { RunContext } from '@openai/agents-core';
import { createTasksTools } from '../src/task/tasks-tools';
import type {
  TasksStore,
  TasksStoreContext,
  TaskRecord,
  TaskDependency,
  TaskNote,
  TaskFile,
} from '../src/task/tasks-store';
import type { AgentContext } from '@anyhunt/agents-runtime';

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
});

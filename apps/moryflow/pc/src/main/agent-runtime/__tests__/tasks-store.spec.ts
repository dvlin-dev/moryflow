/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import {
  mkdtemp,
  rm,
  readdir,
  readFile as fsReadFile,
  writeFile as fsWriteFile,
  mkdir,
  stat,
  access as fsAccess,
  rename,
} from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import type { PlatformCapabilities, CryptoUtils } from '@anyhunt/agents-adapter';
import { createTasksTools } from '@anyhunt/agents-tools';
import type { AgentContext } from '@anyhunt/agents-runtime';
import { RunContext } from '@openai/agents-core';
import { createDesktopTasksStore } from '../tasks-store';

const createVault = async (): Promise<string> => {
  return mkdtemp(path.join(os.tmpdir(), 'moryflow-tasks-'));
};

const createCapabilities = (): PlatformCapabilities => {
  return {
    fs: {
      readFile: async (filePath, encoding) => {
        const data = await fsReadFile(filePath, encoding ?? 'utf-8');
        return typeof data === 'string' ? data : data.toString('utf-8');
      },
      writeFile: async (filePath, content) => {
        await fsWriteFile(filePath, content);
      },
      delete: async (filePath) => {
        await rm(filePath, { recursive: true, force: true });
      },
      move: async (from, to) => {
        await rename(from, to);
      },
      mkdir: async (dirPath, options) => {
        await mkdir(dirPath, { recursive: options?.recursive });
      },
      readdir: async (dirPath) => {
        return readdir(dirPath);
      },
      exists: async (filePath) => {
        try {
          await fsAccess(filePath);
          return true;
        } catch {
          return false;
        }
      },
      stat: async (filePath) => {
        const info = await stat(filePath);
        return {
          isDirectory: info.isDirectory(),
          isFile: info.isFile(),
          size: info.size,
          mtime: info.mtimeMs,
        };
      },
      access: async (filePath) => {
        try {
          await fsAccess(filePath);
          return true;
        } catch {
          return false;
        }
      },
    },
    path,
    storage: {
      get: async () => null,
      set: async () => {},
      remove: async () => {},
    },
    secureStorage: {
      get: async () => null,
      set: async () => {},
      remove: async () => {},
    },
    fetch: (async () => {
      throw new Error('fetch_unavailable');
    }) as typeof globalThis.fetch,
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    platform: 'desktop',
    auth: {
      getToken: async () => null,
      getApiUrl: () => 'http://localhost',
    },
  };
};

const createCrypto = (): CryptoUtils => {
  return {
    randomUUID: () => randomUUID(),
    sha256: (input) => {
      const buffer = typeof input === 'string' ? Buffer.from(input) : Buffer.from(input);
      return createHash('sha256').update(buffer).digest('hex');
    },
  };
};

describe('DesktopTasksStore', () => {
  let vaultRoot = '';

  beforeEach(async () => {
    vaultRoot = await createVault();
  });

  afterEach(async () => {
    if (!vaultRoot) return;
    try {
      await rm(vaultRoot, { recursive: true, force: true });
    } catch {
      // 文件被 sqlite 占用时忽略清理失败
    }
  });

  it('isolates tasks by chatId', async () => {
    const capabilities = createCapabilities();
    const crypto = createCrypto();

    const storeA = createDesktopTasksStore(capabilities, crypto);
    await storeA.init({ vaultRoot });
    await storeA.createTask('chat-a', {
      title: 'Task A',
      description: 'desc',
      priority: 'p1',
    });

    const storeB = createDesktopTasksStore(capabilities, crypto);
    await storeB.init({ vaultRoot });
    const tasksB = await storeB.listTasks('chat-b');
    expect(tasksB).toHaveLength(0);

    await storeB.createTask('chat-b', {
      title: 'Task B',
      description: 'desc',
      priority: 'p2',
    });

    const tasksA = await storeA.listTasks('chat-a');
    expect(tasksA).toHaveLength(1);
    expect(tasksA[0].chatId).toBe('chat-a');
  });

  it('rejects dependency cycles', async () => {
    const store = createDesktopTasksStore(createCapabilities(), createCrypto());
    await store.init({ vaultRoot });

    const taskA = await store.createTask('chat-a', {
      title: 'Task A',
      description: 'desc',
      priority: 'p1',
    });
    const taskB = await store.createTask('chat-a', {
      title: 'Task B',
      description: 'desc',
      priority: 'p1',
    });

    await store.addDependency('chat-a', taskA.id, taskB.id);
    await expect(store.addDependency('chat-a', taskB.id, taskA.id)).rejects.toThrow(
      'dependency_cycle'
    );
  });

  it('guards optimistic lock conflicts', async () => {
    const store = createDesktopTasksStore(createCapabilities(), createCrypto());
    await store.init({ vaultRoot });

    const task = await store.createTask('chat-a', {
      title: 'Task A',
      description: 'desc',
      priority: 'p1',
    });

    await expect(
      store.updateTask('chat-a', task.id, {
        title: 'New title',
        expectedVersion: task.version + 1,
      })
    ).rejects.toThrow('conflict');
  });

  it('updates status timestamps when progressing', async () => {
    const store = createDesktopTasksStore(createCapabilities(), createCrypto());
    await store.init({ vaultRoot });

    const task = await store.createTask('chat-a', {
      title: 'Task A',
      description: 'desc',
      priority: 'p1',
    });

    const inProgress = await store.setStatus('chat-a', task.id, {
      status: 'in_progress',
      expectedVersion: task.version,
      summary: 'start',
    });

    expect(inProgress.status).toBe('in_progress');
    expect(inProgress.startedAt).not.toBeNull();
    expect(inProgress.completedAt).toBeNull();

    const done = await store.setStatus('chat-a', inProgress.id, {
      status: 'done',
      expectedVersion: inProgress.version,
      summary: 'done',
    });

    expect(done.status).toBe('done');
    expect(done.completedAt).not.toBeNull();
  });

  it('returns archived tasks when explicitly filtered', async () => {
    const store = createDesktopTasksStore(createCapabilities(), createCrypto());
    await store.init({ vaultRoot });

    const task = await store.createTask('chat-a', {
      title: 'Task A',
      description: 'desc',
      priority: 'p1',
    });

    await store.setStatus('chat-a', task.id, {
      status: 'archived',
      expectedVersion: task.version,
      summary: 'archived',
    });

    const defaultList = await store.listTasks('chat-a');
    expect(defaultList).toHaveLength(0);

    const archivedList = await store.listTasks('chat-a', { status: ['archived'] });
    expect(archivedList).toHaveLength(1);
    expect(archivedList[0].status).toBe('archived');
  });

  it('retains started/completed timestamps across status changes', async () => {
    const store = createDesktopTasksStore(createCapabilities(), createCrypto());
    await store.init({ vaultRoot });

    const task = await store.createTask('chat-a', {
      title: 'Task A',
      description: 'desc',
      priority: 'p1',
    });

    const inProgress = await store.setStatus('chat-a', task.id, {
      status: 'in_progress',
      expectedVersion: task.version,
      summary: 'start',
    });

    const blocked = await store.setStatus('chat-a', inProgress.id, {
      status: 'blocked',
      expectedVersion: inProgress.version,
      summary: 'blocked',
    });

    expect(blocked.startedAt).toBe(inProgress.startedAt);
    expect(blocked.completedAt).toBeNull();

    const done = await store.setStatus('chat-a', blocked.id, {
      status: 'done',
      expectedVersion: blocked.version,
      summary: 'done',
    });

    expect(done.startedAt).toBe(inProgress.startedAt);
    expect(done.completedAt).not.toBeNull();
  });

  it('syncs subagent status updates via tasks tools', async () => {
    const store = createDesktopTasksStore(createCapabilities(), createCrypto());
    const tools = createTasksTools(store);
    const getTool = (name: string) => tools.find((tool) => tool.name === name)!;

    const parentContext = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot });
    const subagentContext = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot });

    const createResult = (await getTool('tasks_create').invoke(
      parentContext,
      JSON.stringify({
        title: 'Task A',
        description: 'desc',
        priority: 'p1',
      })
    )) as { task: { id: string; version: number } };

    const statusResult = (await getTool('tasks_set_status').invoke(
      subagentContext,
      JSON.stringify({
        taskId: createResult.task.id,
        status: 'done',
        expectedVersion: createResult.task.version,
        statusSummary: 'done',
      })
    )) as { task: { status: string } };

    expect(statusResult.task.status).toBe('done');

    const getResult = (await getTool('tasks_get').invoke(
      parentContext,
      JSON.stringify({ taskId: createResult.task.id })
    )) as { task: { status: string } };

    expect(getResult.task.status).toBe('done');
  });

  it('renders task graph with safe mermaid node ids', async () => {
    const store = createDesktopTasksStore(createCapabilities(), createCrypto());
    const tools = createTasksTools(store);
    const getTool = (name: string) => tools.find((tool) => tool.name === name)!;
    const context = new RunContext<AgentContext>({ chatId: 'chat-a', vaultRoot });

    const taskA = (await getTool('tasks_create').invoke(
      context,
      JSON.stringify({ title: 'Task A', description: 'desc', priority: 'p1' })
    )) as { task: { id: string } };

    const taskB = (await getTool('tasks_create').invoke(
      context,
      JSON.stringify({ title: 'Task B', description: 'desc', priority: 'p1' })
    )) as { task: { id: string } };

    await getTool('tasks_add_dependency').invoke(
      context,
      JSON.stringify({ taskId: taskB.task.id, dependsOn: taskA.task.id })
    );

    const graph = (await getTool('tasks_graph').invoke(context, JSON.stringify({}))) as {
      mermaid: string;
    };

    expect(graph.mermaid).toContain('graph TD');
    expect(graph.mermaid).not.toContain(taskA.task.id);
    expect(graph.mermaid).not.toContain(taskB.task.id);
  });
});

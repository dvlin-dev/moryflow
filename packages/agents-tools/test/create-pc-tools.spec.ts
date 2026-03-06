import { describe, expect, it } from 'vitest';
import type { PlatformCapabilities, CryptoUtils } from '@moryflow/agents-adapter';
import type { VaultUtils } from '@moryflow/agents-runtime';
import type { TasksStore } from '../src/task/tasks-store';
import {
  createPcTools,
  createPcToolsWithoutSubagent,
  type ToolsContext,
} from '../src/create-tools';

const createToolsContext = (): ToolsContext => {
  const capabilities = {
    fetch: globalThis.fetch,
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    auth: {
      getToken: async () => null,
      getApiUrl: () => 'https://server.moryflow.com',
    },
  } as unknown as PlatformCapabilities;

  const crypto = {
    sha256: () => 'hash',
    randomUUID: () => 'uuid',
  } as unknown as CryptoUtils;

  const vaultUtils = {} as VaultUtils;
  const tasksStore = {} as TasksStore;

  return {
    capabilities,
    crypto,
    vaultUtils,
    tasksStore,
  };
};

describe('createPcToolsWithoutSubagent', () => {
  it('仅保留非重叠工具并移除文件/搜索工具', () => {
    const tools = createPcToolsWithoutSubagent(createToolsContext());
    const names = new Set(tools.map((tool) => tool.name));

    expect(names.has('web_fetch')).toBe(true);
    expect(names.has('web_search')).toBe(true);
    expect(names.has('generate_image')).toBe(true);
    expect(names.has('tasks_list')).toBe(true);
    expect(names.has('tasks_graph')).toBe(true);

    expect(names.has('read')).toBe(false);
    expect(names.has('write')).toBe(false);
    expect(names.has('edit')).toBe(false);
    expect(names.has('delete')).toBe(false);
    expect(names.has('move')).toBe(false);
    expect(names.has('ls')).toBe(false);
    expect(names.has('glob')).toBe(false);
    expect(names.has('grep')).toBe(false);
    expect(names.has('search_in_file')).toBe(false);
    expect(names.has('subagent')).toBe(false);
  });

  it('工具清单顺序快照稳定（防止回归膨胀）', () => {
    const tools = createPcToolsWithoutSubagent(createToolsContext());
    expect(tools.map((tool) => tool.name)).toMatchInlineSnapshot(`
      [
        "web_fetch",
        "web_search",
        "generate_image",
        "tasks_list",
        "tasks_get",
        "tasks_create",
        "tasks_update",
        "tasks_set_status",
        "tasks_add_dependency",
        "tasks_remove_dependency",
        "tasks_add_note",
        "tasks_add_files",
        "tasks_delete",
        "tasks_graph",
      ]
    `);
  });
});

describe('createPcTools', () => {
  it('默认包含 subagent 子代理工具', () => {
    const tools = createPcTools(createToolsContext());
    const names = new Set(tools.map((tool) => tool.name));

    expect(names.has('subagent')).toBe(true);
    expect(names.has('web_fetch')).toBe(true);
    expect(names.has('web_search')).toBe(true);
    expect(names.has('tasks_list')).toBe(true);
    expect(names.has('read')).toBe(false);
    expect(names.has('glob')).toBe(false);
  });
});

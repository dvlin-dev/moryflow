import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlatformCapabilities, CryptoUtils } from '@moryflow/agents-adapter';
import type { VaultUtils } from '@moryflow/agents-runtime';
import type { TasksStore } from '../src/task/tasks-store';
import { createPcTools } from '../src/create-tools';

const { createSubagentToolMock } = vi.hoisted(() => ({
  createSubagentToolMock: vi.fn(
    () => ({ name: 'subagent', type: 'function' }) as unknown as { name: string; type: string }
  ),
}));

vi.mock('../src/task/subagent-tool', () => ({
  createSubagentTool: createSubagentToolMock,
}));

const createToolsContext = () => {
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

  return { capabilities, crypto, vaultUtils, tasksStore };
};

afterEach(() => {
  createSubagentToolMock.mockClear();
});

describe('createPcTools subagent defaults', () => {
  it('默认子代理工具集应继承同端全能力（无角色分流）', () => {
    createPcTools(createToolsContext());

    expect(createSubagentToolMock).toHaveBeenCalledTimes(1);
    const subagentTools = createSubagentToolMock.mock.calls[0]?.[0] as Array<{ name: string }>;
    const names = subagentTools.map((tool) => tool.name);

    expect(names).toContain('web_fetch');
    expect(names).toContain('web_search');
    expect(names).toContain('generate_image');
    expect(names).toContain('tasks_list');
    expect(names).toContain('tasks_graph');
    expect(names).not.toContain('read');
    expect(names).not.toContain('glob');
  }, 20_000);
});

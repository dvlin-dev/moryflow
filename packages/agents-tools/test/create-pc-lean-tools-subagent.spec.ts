import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlatformCapabilities, CryptoUtils } from '@moryflow/agents-adapter';
import type { VaultUtils } from '@moryflow/agents-runtime';
import type { TasksStore } from '../src/task/tasks-store';

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
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock('../src/task/subagent-tool');
});

describe('createPcLeanTools subagent defaults', () => {
  it('默认子代理工具集应继承同端全能力（无角色分流）', async () => {
    const createSubagentTool = vi.fn(() => ({ name: 'subagent', type: 'function' }) as any);

    vi.doMock('../src/task/subagent-tool', () => ({
      createSubagentTool,
    }));

    const { createPcLeanTools } = await import('../src/create-tools');
    createPcLeanTools(createToolsContext());

    expect(createSubagentTool).toHaveBeenCalledTimes(1);
    const subagentTools = createSubagentTool.mock.calls[0][0] as Array<{ name: string }>;
    const names = subagentTools.map((tool) => tool.name);

    expect(names).toContain('web_fetch');
    expect(names).toContain('web_search');
    expect(names).toContain('generate_image');
    expect(names).toContain('tasks_list');
    expect(names).toContain('tasks_graph');
    expect(names).not.toContain('read');
    expect(names).not.toContain('glob');
  });
});

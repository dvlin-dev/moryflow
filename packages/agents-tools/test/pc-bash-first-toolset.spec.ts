import { describe, expect, it } from 'vitest';
import type { PlatformCapabilities, CryptoUtils } from '@moryflow/agents-adapter';
import type { VaultUtils } from '@moryflow/agents-runtime';
import type { TaskStateService } from '../src/task/task-state';
import { createPcBashFirstToolset, type ToolsetContext } from '../src/toolset/pc-bash-first';

const createToolsContext = (): ToolsetContext => {
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
  const taskStateService = {} as TaskStateService;

  return {
    capabilities,
    crypto,
    vaultUtils,
    taskStateService,
  };
};

describe('createPcBashFirstToolset', () => {
  it('仅保留 bash-first 非重叠工具并移除文件/搜索工具', () => {
    const tools = createPcBashFirstToolset(createToolsContext());
    const names = new Set(tools.map((tool) => tool.name));

    expect(names.has('web_fetch')).toBe(true);
    expect(names.has('web_search')).toBe(true);
    expect(names.has('generate_image')).toBe(true);
    expect(names.has('task')).toBe(true);

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
    const tools = createPcBashFirstToolset(createToolsContext());
    expect(tools.map((tool) => tool.name)).toMatchInlineSnapshot(`
      [
        "web_fetch",
        "web_search",
        "generate_image",
        "task",
      ]
    `);
  });
});

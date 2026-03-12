import { describe, expect, it } from 'vitest';
import type { PlatformCapabilities, CryptoUtils } from '@moryflow/agents-adapter';
import type { VaultUtils } from '@moryflow/agents-runtime';
import type { TaskStateService } from '../src/task/task-state';
import {
  createMobileFileToolsToolset,
  type ToolsetContext,
} from '../src/toolset/mobile-file-tools';

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

describe('createMobileFileToolsToolset', () => {
  it('提供移动端完整文件与搜索工具，不注入 bash 或 subagent', () => {
    const tools = createMobileFileToolsToolset(createToolsContext());
    const names = new Set(tools.map((tool) => tool.name));

    expect(names.has('read')).toBe(true);
    expect(names.has('write')).toBe(true);
    expect(names.has('edit')).toBe(true);
    expect(names.has('delete')).toBe(true);
    expect(names.has('move')).toBe(true);
    expect(names.has('ls')).toBe(true);
    expect(names.has('glob')).toBe(true);
    expect(names.has('grep')).toBe(true);
    expect(names.has('search_in_file')).toBe(true);
    expect(names.has('web_fetch')).toBe(true);
    expect(names.has('web_search')).toBe(true);
    expect(names.has('generate_image')).toBe(true);
    expect(names.has('task')).toBe(true);
    expect(names.has('bash')).toBe(false);
    expect(names.has('subagent')).toBe(false);
  });
});

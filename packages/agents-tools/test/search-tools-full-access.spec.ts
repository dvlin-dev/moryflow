import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { RunContext } from '@openai/agents-core';
import type { PlatformCapabilities, FileInfo } from '@moryflow/agents-adapter';
import type { AgentContext, VaultUtils } from '@moryflow/agents-runtime';
import { setGlobImpl } from '../src/glob/glob-interface';
import { createGlobTool } from '../src/search/glob-tool';
import { createGrepTool } from '../src/search/grep-tool';

const createCapabilities = (input: {
  stat?: (filePath: string) => Promise<FileInfo>;
  readFile?: (filePath: string, encoding?: 'utf-8') => Promise<string>;
}): PlatformCapabilities => ({
  fs: {
    readFile: input.readFile ?? (async () => ''),
    writeFile: async () => {},
    delete: async () => {},
    move: async () => {},
    mkdir: async () => {},
    readdir: async () => [],
    exists: async () => true,
    stat:
      input.stat ??
      (async () => ({
        isDirectory: false,
        isFile: true,
        size: 0,
        mtime: Date.now(),
      })),
    access: async () => true,
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
  fetch: globalThis.fetch,
  logger: {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  },
  platform: 'desktop',
  auth: {
    getToken: async () => null,
    getApiUrl: () => 'https://example.invalid',
  },
});

const createVaultUtils = (vaultRoot: string): VaultUtils =>
  ({
    getVaultRoot: async () => vaultRoot,
    resolvePath: async (targetPath: string) => ({
      root: vaultRoot,
      absolute: path.resolve(vaultRoot, targetPath),
      relative: targetPath,
    }),
    readFile: async () => ({
      absolute: path.join(vaultRoot, 'dummy'),
      relative: 'dummy',
      content: '',
      sha256: 'dummy',
      size: 0,
      mtime: Date.now(),
    }),
    computeSha256: async () => 'dummy',
    ensureFileReadable: async () => ({
      isDirectory: false,
      isFile: true,
      size: 0,
      mtime: Date.now(),
    }),
  }) as VaultUtils;

describe('search tools full_access absolute path handling', () => {
  it('glob: full_access 保留绝对 pattern，并按绝对匹配结果读取文件信息', async () => {
    const globMock = vi.fn().mockResolvedValue(['/etc/hosts']);
    setGlobImpl({
      glob: globMock,
    });
    const statMock = vi.fn(async () => ({
      isDirectory: false,
      isFile: true,
      size: 128,
      mtime: 1700000000000,
    }));
    const capabilities = createCapabilities({ stat: statMock });
    const tool = createGlobTool(capabilities, createVaultUtils('/vault'));
    const context = new RunContext<AgentContext>({
      chatId: 'chat-a',
      vaultRoot: '/vault',
      mode: 'full_access',
    });

    const result = (await tool.invoke(
      context,
      JSON.stringify({
        pattern: '/etc/*',
        max_results: 50,
        include_directories: false,
      })
    )) as {
      pattern: string;
      matches: Array<{ path: string }>;
    };

    expect(globMock).toHaveBeenCalledWith(
      expect.objectContaining({
        patterns: ['/etc/*'],
      })
    );
    expect(statMock).toHaveBeenCalledWith('/etc/hosts');
    expect(result.pattern).toBe('/etc/*');
    expect(result.matches[0]?.path).toBe('/etc/hosts');
  });

  it('grep: full_access 下绝对 glob 结果按绝对路径读取，不拼接 root', async () => {
    const globMock = vi.fn().mockResolvedValue(['/external/logs/app.log']);
    setGlobImpl({
      glob: globMock,
    });
    const readFileMock = vi.fn(async () => 'hello world\nnext line');
    const capabilities = createCapabilities({ readFile: readFileMock });
    const tool = createGrepTool(capabilities, createVaultUtils('/vault'));
    const context = new RunContext<AgentContext>({
      chatId: 'chat-b',
      vaultRoot: '/vault',
      mode: 'full_access',
    });

    const result = (await tool.invoke(
      context,
      JSON.stringify({
        query: 'hello',
        glob: '/external/logs/*.log',
        limit: 20,
        case_sensitive: false,
      })
    )) as {
      matches: Array<{ path: string; line: number }>;
    };

    expect(globMock).toHaveBeenCalledWith(
      expect.objectContaining({
        patterns: ['/external/logs/*.log'],
      })
    );
    expect(readFileMock).toHaveBeenCalledWith('/external/logs/app.log', 'utf-8');
    expect(result.matches[0]?.path).toBe('/external/logs/app.log');
    expect(result.matches[0]?.line).toBe(1);
  });
});

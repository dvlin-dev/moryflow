/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';

vi.mock('electron-store', () => ({
  default: class MockElectronStore<T extends Record<string, unknown>> {
    store: T;

    constructor(options?: { defaults?: T }) {
      this.store = (options?.defaults ?? ({} as T)) as T;
    }
  },
}));

import { createManagedMcpRuntime } from './index';

const createMemoryStateStore = () => {
  let state: { servers: Record<string, any> } = { servers: {} };
  return {
    store: {
      read: () => state,
      write: (next: { servers: Record<string, any> }) => {
        state = next;
      },
    },
    getState: () => state,
  };
};

describe('managed-mcp-runtime', () => {
  it('refreshEnabledServers only updates enabled stdio MCP servers', async () => {
    const memory = createMemoryStateStore();

    const installLatest = vi.fn(async () => undefined);
    const readManifest = vi.fn(async (_runtimeDir: string, packageName: string) => ({
      version: '1.0.0',
      packageDir: `/tmp/${packageName}`,
      bin: { cli: 'dist/cli.js' },
    }));

    const runtime = createManagedMcpRuntime({
      stateStore: memory.store,
      installLatest,
      readManifest,
      now: () => 123,
      verifyScriptPath: vi.fn(async () => undefined),
    });

    const result = await runtime.refreshEnabledServers([
      {
        id: 'enabled',
        enabled: true,
        name: 'Enabled',
        packageName: '@scope/enabled',
        binName: 'cli',
        args: [],
      },
      {
        id: 'disabled',
        enabled: false,
        name: 'Disabled',
        packageName: '@scope/disabled',
        args: [],
      },
    ]);

    expect(installLatest).toHaveBeenCalledTimes(1);
    expect(installLatest).toHaveBeenCalledWith(expect.any(String), '@scope/enabled');
    expect(result.updatedServerIds).toEqual(['enabled']);
    expect(result.failed).toEqual([]);
    expect(memory.getState().servers['enabled']).toMatchObject({
      packageName: '@scope/enabled',
      installedVersion: '1.0.0',
      lastUpdatedAt: 123,
      lastError: undefined,
    });
    expect(memory.getState().servers['disabled']).toBeUndefined();
  });

  it('continues refreshing remaining servers when one package install fails', async () => {
    const memory = createMemoryStateStore();

    const installLatest = vi.fn(async (_runtimeDir: string, packageName: string) => {
      if (packageName === '@scope/fail') {
        throw new Error('install failed');
      }
    });

    const readManifest = vi.fn(async (_runtimeDir: string, packageName: string) => {
      if (packageName === '@scope/ok') {
        return {
          version: '2.0.0',
          packageDir: '/tmp/ok',
          bin: { ok: 'dist/ok.js' },
        };
      }

      const error = new Error('not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    });

    const runtime = createManagedMcpRuntime({
      stateStore: memory.store,
      installLatest,
      readManifest,
      now: () => 456,
      verifyScriptPath: vi.fn(async () => undefined),
    });

    const result = await runtime.refreshEnabledServers([
      {
        id: 'fail',
        enabled: true,
        name: 'Fail MCP',
        packageName: '@scope/fail',
        args: [],
      },
      {
        id: 'ok',
        enabled: true,
        name: 'OK MCP',
        packageName: '@scope/ok',
        binName: 'ok',
        args: ['--x'],
      },
    ]);

    expect(result.updatedServerIds).toEqual(['ok']);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]).toMatchObject({
      id: 'fail',
      error: 'install failed',
    });
    expect(memory.getState().servers['fail']).toMatchObject({
      packageName: '@scope/fail',
      lastError: 'install failed',
    });
    expect(memory.getState().servers['ok']).toMatchObject({
      packageName: '@scope/ok',
      installedVersion: '2.0.0',
      lastUpdatedAt: 456,
    });
  });

  it('marks server as failed when package exposes multiple bins without explicit binName', async () => {
    const memory = createMemoryStateStore();

    const runtime = createManagedMcpRuntime({
      stateStore: memory.store,
      installLatest: vi.fn(async () => undefined),
      readManifest: vi.fn(async () => ({
        version: '1.2.3',
        packageDir: '/tmp/multi-bin',
        bin: {
          first: 'dist/first.js',
          second: 'dist/second.js',
        },
      })),
      verifyScriptPath: vi.fn(async () => undefined),
    });

    const result = await runtime.resolveEnabledServers([
      {
        id: 'multi',
        enabled: true,
        name: 'Multi bin',
        packageName: '@scope/multi',
        args: [],
      },
    ]);

    expect(result.resolved).toEqual([]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.error).toContain('multiple bins');
  });
});

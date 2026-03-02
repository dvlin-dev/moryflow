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

const createMemoryStateStore = (initial?: { servers: Record<string, any> }) => {
  let state: { servers: Record<string, any> } = initial ?? { servers: {} };
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
      runtimeRootDir: '/runtime-root',
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
        autoUpdate: 'startup-latest',
        packageName: '@scope/enabled',
        binName: 'cli',
        args: [],
      },
      {
        id: 'disabled',
        enabled: false,
        name: 'Disabled',
        autoUpdate: 'startup-latest',
        packageName: '@scope/disabled',
        args: [],
      },
    ]);

    expect(installLatest).toHaveBeenCalledTimes(1);
    expect(installLatest).toHaveBeenCalledWith('/runtime-root/enabled', '@scope/enabled');
    expect(result.changedServerIds).toEqual(['enabled']);
    expect(result.failed).toEqual([]);
    expect(memory.getState().servers['enabled']).toMatchObject({
      packageName: '@scope/enabled',
      runtimeDir: '/runtime-root/enabled',
      installedVersion: '1.0.0',
      lastUpdatedAt: 123,
      lastError: undefined,
    });
    expect(memory.getState().servers['disabled']).toBeUndefined();
  });

  it('marks changedServerIds only when installed version changed', async () => {
    const memory = createMemoryStateStore({
      servers: {
        s1: {
          packageName: '@scope/pkg',
          binName: 'cli',
          runtimeDir: '/runtime-root/s1',
          installedVersion: '1.0.0',
          lastUpdatedAt: 101,
        },
      },
    });

    const installLatest = vi.fn(async () => undefined);
    const verifyScriptPath = vi.fn(async () => undefined);

    const stableRuntime = createManagedMcpRuntime({
      stateStore: memory.store,
      runtimeRootDir: '/runtime-root',
      installLatest,
      readManifest: vi.fn(async () => ({
        version: '1.0.0',
        packageDir: '/tmp/pkg',
        bin: { cli: 'dist/cli.js' },
      })),
      verifyScriptPath,
    });

    const unchanged = await stableRuntime.refreshEnabledServers([
      {
        id: 's1',
        enabled: true,
        name: 'S1',
        autoUpdate: 'startup-latest',
        packageName: '@scope/pkg',
        binName: 'cli',
        args: [],
      },
    ]);

    expect(unchanged.changedServerIds).toEqual([]);

    const changedRuntime = createManagedMcpRuntime({
      stateStore: memory.store,
      runtimeRootDir: '/runtime-root',
      installLatest,
      readManifest: vi.fn(async () => ({
        version: '1.1.0',
        packageDir: '/tmp/pkg',
        bin: { cli: 'dist/cli.js' },
      })),
      verifyScriptPath,
    });

    const changed = await changedRuntime.refreshEnabledServers([
      {
        id: 's1',
        enabled: true,
        name: 'S1',
        autoUpdate: 'startup-latest',
        packageName: '@scope/pkg',
        binName: 'cli',
        args: [],
      },
    ]);

    expect(changed.changedServerIds).toEqual(['s1']);
  });

  it('falls back to previous version when latest update fails and old package exists', async () => {
    const memory = createMemoryStateStore({
      servers: {
        s1: {
          packageName: '@scope/pkg',
          binName: 'cli',
          runtimeDir: '/runtime-root/s1',
          installedVersion: '1.0.0',
          lastUpdatedAt: 101,
        },
      },
    });

    const installLatest = vi.fn(async () => {
      throw new Error('install failed');
    });

    const runtime = createManagedMcpRuntime({
      stateStore: memory.store,
      runtimeRootDir: '/runtime-root',
      installLatest,
      readManifest: vi.fn(async () => ({
        version: '1.0.0',
        packageDir: '/tmp/pkg',
        bin: { cli: 'dist/cli.js' },
      })),
      verifyScriptPath: vi.fn(async () => undefined),
    });

    const result = await runtime.refreshEnabledServers([
      {
        id: 's1',
        enabled: true,
        name: 'S1',
        autoUpdate: 'startup-latest',
        packageName: '@scope/pkg',
        binName: 'cli',
        args: [],
      },
    ]);

    expect(result.failed).toEqual([]);
    expect(result.changedServerIds).toEqual([]);
    expect(memory.getState().servers['s1']).toMatchObject({
      packageName: '@scope/pkg',
      installedVersion: '1.0.0',
    });
    expect(memory.getState().servers['s1']?.lastError).toContain('fallback to previous version');
  });

  it('continues refreshing remaining servers when one package install fails for first install', async () => {
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
      runtimeRootDir: '/runtime-root',
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
        autoUpdate: 'startup-latest',
        packageName: '@scope/fail',
        args: [],
      },
      {
        id: 'ok',
        enabled: true,
        name: 'OK MCP',
        autoUpdate: 'startup-latest',
        packageName: '@scope/ok',
        binName: 'ok',
        args: ['--x'],
      },
    ]);

    expect(result.changedServerIds).toEqual(['ok']);
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

  it('reinstalls package when existing manifest is corrupted', async () => {
    const memory = createMemoryStateStore();
    const installLatest = vi.fn(async () => undefined);
    const readManifest = vi
      .fn()
      .mockRejectedValueOnce(new Error('Unexpected token in package.json'))
      .mockResolvedValue({
        version: '1.0.1',
        packageDir: '/tmp/pkg',
        bin: { cli: 'dist/cli.js' },
      });

    const runtime = createManagedMcpRuntime({
      stateStore: memory.store,
      runtimeRootDir: '/runtime-root',
      installLatest,
      readManifest,
      verifyScriptPath: vi.fn(async () => undefined),
    });

    const result = await runtime.resolveEnabledServers([
      {
        id: 'corrupted',
        enabled: true,
        name: 'Corrupted',
        autoUpdate: 'startup-latest',
        packageName: '@scope/corrupted',
        binName: 'cli',
        args: [],
      },
    ]);

    expect(installLatest).toHaveBeenCalledTimes(1);
    expect(result.failed).toEqual([]);
    expect(result.resolved).toHaveLength(1);
    expect(memory.getState().servers['corrupted']?.lastError).toContain(
      'existing runtime is invalid, reinstalling'
    );
  });

  it('restores runtime backup when latest version bin resolution fails', async () => {
    const memory = createMemoryStateStore({
      servers: {
        s1: {
          packageName: '@scope/pkg',
          binName: 'cli',
          runtimeDir: '/runtime-root/s1',
          installedVersion: '1.0.0',
          lastUpdatedAt: 101,
        },
      },
    });

    let phase: 'initial' | 'updated' | 'restored' = 'initial';
    const oldManifest = {
      version: '1.0.0',
      packageDir: '/runtime-root/s1/node_modules/@scope/pkg',
      bin: { cli: 'dist/cli-old.js' },
    };
    const newManifest = {
      version: '2.0.0',
      packageDir: '/runtime-root/s1/node_modules/@scope/pkg',
      bin: { cli: 'dist/cli-new.js' },
    };

    const installLatest = vi.fn(async () => {
      phase = 'updated';
    });
    const readManifest = vi.fn(async () => (phase === 'updated' ? newManifest : oldManifest));
    const createRuntimeBackup = vi.fn(async () => '/runtime-root/s1.backup');
    const restoreRuntimeFromBackup = vi.fn(async () => {
      phase = 'restored';
    });
    const removeRuntimeBackup = vi.fn(async () => undefined);
    const verifyScriptPath = vi.fn(async (scriptPath: string) => {
      if (scriptPath.includes('cli-new.js')) {
        throw new Error('missing executable');
      }
    });

    const runtime = createManagedMcpRuntime({
      stateStore: memory.store,
      runtimeRootDir: '/runtime-root',
      installLatest,
      readManifest,
      createRuntimeBackup,
      restoreRuntimeFromBackup,
      removeRuntimeBackup,
      verifyScriptPath,
    });

    const result = await runtime.refreshEnabledServers([
      {
        id: 's1',
        enabled: true,
        name: 'S1',
        autoUpdate: 'startup-latest',
        packageName: '@scope/pkg',
        binName: 'cli',
        args: [],
      },
    ]);

    expect(restoreRuntimeFromBackup).toHaveBeenCalledWith(
      '/runtime-root/s1',
      '/runtime-root/s1.backup'
    );
    expect(removeRuntimeBackup).toHaveBeenCalledWith('/runtime-root/s1.backup');
    expect(result.failed).toEqual([]);
    expect(result.changedServerIds).toEqual([]);
    expect(memory.getState().servers['s1']).toMatchObject({
      installedVersion: '1.0.0',
    });
    expect(memory.getState().servers['s1']?.lastError).toContain(
      'new version bin resolve failed, fallback to previous version'
    );
  });

  it('cleans backup when fallback bin resolution still fails', async () => {
    const memory = createMemoryStateStore({
      servers: {
        s1: {
          packageName: '@scope/pkg',
          binName: 'cli',
          runtimeDir: '/runtime-root/s1',
          installedVersion: '1.0.0',
          lastUpdatedAt: 101,
        },
      },
    });

    let phase: 'initial' | 'updated' | 'restored' = 'initial';
    const oldManifest = {
      version: '1.0.0',
      packageDir: '/runtime-root/s1/node_modules/@scope/pkg',
      bin: { cli: 'dist/cli-old.js' },
    };
    const newManifest = {
      version: '2.0.0',
      packageDir: '/runtime-root/s1/node_modules/@scope/pkg',
      bin: { cli: 'dist/cli-new.js' },
    };

    const installLatest = vi.fn(async () => {
      phase = 'updated';
    });
    const readManifest = vi.fn(async () => (phase === 'updated' ? newManifest : oldManifest));
    const createRuntimeBackup = vi.fn(async () => '/runtime-root/s1.backup');
    const restoreRuntimeFromBackup = vi.fn(async () => {
      phase = 'restored';
    });
    const removeRuntimeBackup = vi.fn(async () => undefined);
    const verifyScriptPath = vi.fn(async () => {
      throw new Error('missing executable');
    });

    const runtime = createManagedMcpRuntime({
      stateStore: memory.store,
      runtimeRootDir: '/runtime-root',
      installLatest,
      readManifest,
      createRuntimeBackup,
      restoreRuntimeFromBackup,
      removeRuntimeBackup,
      verifyScriptPath,
    });

    const result = await runtime.refreshEnabledServers([
      {
        id: 's1',
        enabled: true,
        name: 'S1',
        autoUpdate: 'startup-latest',
        packageName: '@scope/pkg',
        binName: 'cli',
        args: [],
      },
    ]);

    expect(result.failed).toHaveLength(1);
    expect(removeRuntimeBackup).toHaveBeenCalledWith('/runtime-root/s1.backup');
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
        autoUpdate: 'startup-latest',
        packageName: '@scope/multi',
        args: [],
      },
    ]);

    expect(result.resolved).toEqual([]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.error).toContain('multiple bins');
  });

  it('injects ELECTRON_RUN_AS_NODE when resolving managed stdio launch env', async () => {
    const memory = createMemoryStateStore();

    const runtime = createManagedMcpRuntime({
      stateStore: memory.store,
      installLatest: vi.fn(async () => undefined),
      readManifest: vi.fn(async () => ({
        version: '1.0.0',
        packageDir: '/tmp/env',
        bin: { cli: 'dist/cli.js' },
      })),
      verifyScriptPath: vi.fn(async () => undefined),
    });

    const result = await runtime.resolveEnabledServers([
      {
        id: 'env-server',
        enabled: true,
        name: 'Env server',
        autoUpdate: 'startup-latest',
        packageName: '@scope/env',
        binName: 'cli',
        args: [],
        env: {
          MCP_TOKEN: 'secret',
        },
      },
    ]);

    expect(result.failed).toEqual([]);
    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0]?.env).toEqual({
      MCP_TOKEN: 'secret',
      ELECTRON_RUN_AS_NODE: '1',
    });
  });

  it('rejects invalid packageName before npm install execution', async () => {
    const memory = createMemoryStateStore();
    const installLatest = vi.fn(async () => undefined);
    const readManifest = vi.fn(async () => ({
      version: '1.0.0',
      packageDir: '/tmp/ignored',
      bin: { cli: 'dist/cli.js' },
    }));

    const runtime = createManagedMcpRuntime({
      stateStore: memory.store,
      installLatest,
      readManifest,
      verifyScriptPath: vi.fn(async () => undefined),
    });

    const result = await runtime.resolveEnabledServers([
      {
        id: 'bad-package',
        enabled: true,
        name: 'Bad package',
        autoUpdate: 'startup-latest',
        packageName: '../../tmp/malicious',
        binName: 'cli',
        args: [],
      },
    ]);

    expect(installLatest).not.toHaveBeenCalled();
    expect(readManifest).not.toHaveBeenCalled();
    expect(result.resolved).toEqual([]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.error).toContain('Invalid package name');
  });
});

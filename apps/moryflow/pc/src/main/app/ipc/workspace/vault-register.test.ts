/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getActiveVaultInfoMock = vi.hoisted(() => vi.fn());
const readVaultTreeMock = vi.hoisted(() => vi.fn());
const readVaultTreeRootMock = vi.hoisted(() => vi.fn());

vi.mock('../../../vault/index.js', () => ({
  createVault: vi.fn(),
  ensureDefaultWorkspace: vi.fn(),
  getActiveVaultInfo: getActiveVaultInfoMock,
  getVaults: vi.fn(() => []),
  openVault: vi.fn(),
  readVaultTree: readVaultTreeMock,
  readVaultTreeChildren: vi.fn(),
  readVaultTreeRoot: readVaultTreeRootMock,
  removeVault: vi.fn(),
  selectDirectory: vi.fn(),
  switchVault: vi.fn(),
  updateVaultName: vi.fn(),
}));

describe('registerVaultIpcHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not reschedule the main watcher when reading a non-active vault tree', async () => {
    getActiveVaultInfoMock.mockResolvedValue({
      id: 'vault-1',
      name: 'Active',
      path: '/tmp/active',
      addedAt: 1,
    });
    readVaultTreeMock.mockResolvedValue([{ path: '/tmp/other/file.md' }]);
    readVaultTreeRootMock.mockResolvedValue([{ path: '/tmp/other' }]);

    const handlers = new Map<string, (event: unknown, payload?: unknown) => unknown>();
    const ipcMain = {
      handle: vi.fn((channel: string, handler: (event: unknown, payload?: unknown) => unknown) => {
        handlers.set(channel, handler);
      }),
    };

    const deps = {
      ensureActiveVaultReady: vi.fn(async () => undefined),
      vaultWatcherController: {
        scheduleStart: vi.fn(),
        updateExpandedWatchers: vi.fn(async () => undefined),
      },
      cloudSyncEngine: {
        stop: vi.fn(),
      },
      memoryIndexingEngine: {
        stop: vi.fn(),
      },
      searchIndexService: {
        resetScope: vi.fn(),
      },
    };

    const { registerVaultIpcHandlers } = await import('./vault-register.js');
    registerVaultIpcHandlers(ipcMain, deps);

    await handlers.get('vault:readTree')?.({}, { path: '/tmp/other' });
    await handlers.get('vault:readTreeRoot')?.({}, { path: '/tmp/other' });

    expect(deps.vaultWatcherController.scheduleStart).not.toHaveBeenCalled();
  });

  it('does not schedule a delayed watcher restart when an active vault already exists', async () => {
    const activeVault = {
      id: 'vault-1',
      name: 'Workspace',
      path: '/tmp/workspace',
      addedAt: 1,
    };
    getActiveVaultInfoMock.mockResolvedValue(activeVault);

    const handlers = new Map<string, (event: unknown, payload?: unknown) => unknown>();
    const ipcMain = {
      handle: vi.fn((channel: string, handler: (event: unknown, payload?: unknown) => unknown) => {
        handlers.set(channel, handler);
      }),
    };

    const deps = {
      ensureActiveVaultReady: vi.fn(async () => undefined),
      vaultWatcherController: {
        scheduleStart: vi.fn(),
        updateExpandedWatchers: vi.fn(async () => undefined),
      },
      cloudSyncEngine: {
        stop: vi.fn(),
      },
      memoryIndexingEngine: {
        stop: vi.fn(),
      },
      searchIndexService: {
        resetScope: vi.fn(),
      },
    };

    const { registerVaultIpcHandlers } = await import('./vault-register.js');
    registerVaultIpcHandlers(ipcMain, deps);

    const handler = handlers.get('vault:ensureDefaultWorkspace');
    expect(handler).toBeTypeOf('function');

    const result = await handler?.({});

    expect(result).toEqual(activeVault);
    expect(deps.ensureActiveVaultReady).toHaveBeenCalledWith(activeVault.path);
    expect(deps.vaultWatcherController.scheduleStart).not.toHaveBeenCalled();
  });
});

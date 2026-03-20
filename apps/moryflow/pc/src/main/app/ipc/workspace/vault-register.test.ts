/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getActiveVaultInfoMock = vi.hoisted(() => vi.fn());

vi.mock('../../../vault.js', () => ({
  createVault: vi.fn(),
  ensureDefaultWorkspace: vi.fn(),
  getActiveVaultInfo: getActiveVaultInfoMock,
  getVaults: vi.fn(() => []),
  openVault: vi.fn(),
  readVaultTree: vi.fn(),
  readVaultTreeChildren: vi.fn(),
  readVaultTreeRoot: vi.fn(),
  removeVault: vi.fn(),
  selectDirectory: vi.fn(),
  switchVault: vi.fn(),
  updateVaultName: vi.fn(),
}));

describe('registerVaultIpcHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

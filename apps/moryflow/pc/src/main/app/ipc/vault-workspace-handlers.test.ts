import { describe, expect, it, vi } from 'vitest';

import { registerVaultWorkspaceIpcHandlers } from './vault-workspace-handlers.js';

describe('registerVaultWorkspaceIpcHandlers', () => {
  it('registers vault, workspace and file channels without owning search channels', () => {
    const handle = vi.fn();

    registerVaultWorkspaceIpcHandlers({
      ipcMain: { handle },
      deps: {
        createVault: vi.fn(),
        ensureDefaultWorkspace: vi.fn(async () => null),
        openVault: vi.fn(),
        selectDirectory: vi.fn(),
        getVaults: vi.fn(() => []),
        getActiveVaultInfo: vi.fn(async () => null),
        switchVault: vi.fn(async () => null),
        removeVault: vi.fn(),
        updateVaultName: vi.fn(),
        readVaultTreeRoot: vi.fn(async () => []),
        readVaultTreeChildren: vi.fn(async () => []),
        readVaultTree: vi.fn(async () => []),
        readVaultFile: vi.fn(),
        writeVaultFile: vi.fn(),
        createVaultFile: vi.fn(),
        createVaultFolder: vi.fn(),
        renameVaultEntry: vi.fn(),
        moveVaultEntry: vi.fn(),
        deleteVaultEntry: vi.fn(),
        showItemInFinder: vi.fn(),
        getStoredVault: vi.fn(async () => ({ path: '/vaults/main' })),
        getExpandedPaths: vi.fn(() => []),
        setExpandedPaths: vi.fn(),
        getDocumentSession: vi.fn(() => ({ tabs: [], activePath: null })),
        setDocumentSession: vi.fn(),
        getLastSidebarMode: vi.fn(() => 'home'),
        setLastSidebarMode: vi.fn(),
        getRecentFiles: vi.fn(() => []),
        recordRecentFile: vi.fn(),
        removeRecentFile: vi.fn(),
        getTreeCache: vi.fn(() => null),
        setTreeCache: vi.fn(),
        vaultWatcherController: {
          scheduleStart: vi.fn(),
          updateExpandedWatchers: vi.fn(async () => undefined),
        },
        cloudSyncEngine: {
          stop: vi.fn(),
          init: vi.fn(async () => undefined),
        },
        memoryIndexingEngine: {
          stop: vi.fn(),
        },
        searchIndexService: {
          resetScope: vi.fn(),
          query: vi.fn(() => []),
          rebuild: vi.fn(),
          getStatus: vi.fn(() => ({ ready: true })),
        },
        getTreeCacheNodeTypeGuard: vi.fn((nodes) => nodes),
        existsSync: vi.fn(() => true),
        shell: { openPath: vi.fn(async () => '') },
        pathUtils: { resolve: vi.fn((value) => value) },
        isToolOutputPathAllowed: vi.fn(() => true),
        ensureActiveVaultReady: vi.fn(async () => undefined),
        broadcastToAllWindows: vi.fn(),
      },
    });

    const channels = handle.mock.calls.map(([channel]) => channel);
    expect(channels).toContain('vault:open');
    expect(channels).toContain('vault:getVaults');
    expect(channels).toContain('workspace:getExpandedPaths');
    expect(channels).toContain('files:read');
    expect(channels).not.toContain('search:query');
    expect(channels).not.toContain('search:rebuild');
    expect(channels).not.toContain('search:getStatus');
  });
});

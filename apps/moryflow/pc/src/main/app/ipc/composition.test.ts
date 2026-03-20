import { describe, expect, it, vi } from 'vitest';

import { registerIpcComposition } from './composition.js';
import { registerSearchIpcHandlers } from './search-handlers.js';
import { registerVaultWorkspaceIpcHandlers } from './vault-workspace-handlers.js';

describe('registerIpcComposition', () => {
  it('wires subscriptions and delegates each domain to its registrar', () => {
    const ipcMain = { handle: vi.fn() };
    const subscribeTelegramStatus = vi.fn();
    const subscribeUpdates = vi.fn();
    const subscribeAutomationStatus = vi.fn();
    const broadcastToAllWindows = vi.fn();

    const registerAutomationsIpcHandlers = vi.fn();
    const registerAppShellIpcHandlers = vi.fn();
    const registerVaultWorkspaceIpcHandlers = vi.fn();
    const registerSearchIpcHandlers = vi.fn();
    const registerMemoryIpcHandlers = vi.fn();
    const registerAgentIpcHandlers = vi.fn();
    const registerOllamaIpcHandlers = vi.fn();
    const registerMembershipIpcHandlers = vi.fn();
    const registerTelegramIpcHandlers = vi.fn();
    const registerCloudSyncIpcHandlers = vi.fn();

    registerIpcComposition({
      ipcMain,
      subscribeTelegramStatus,
      subscribeUpdates,
      subscribeAutomationStatus,
      broadcastToAllWindows,
      registerAutomationsIpcHandlers,
      automationService: { id: 'automation' },
      registerAppShellIpcHandlers,
      appShellDeps: { id: 'app-shell' },
      registerVaultWorkspaceIpcHandlers,
      vaultWorkspaceDeps: { id: 'vault-workspace' },
      registerSearchIpcHandlers,
      searchDeps: { id: 'search' },
      registerMemoryIpcHandlers,
      memoryIpcDeps: { id: 'memory' },
      registerAgentIpcHandlers,
      agentDeps: { id: 'agent' },
      registerOllamaIpcHandlers,
      ollamaDeps: { id: 'ollama' },
      registerMembershipIpcHandlers,
      membershipDeps: { id: 'membership' },
      registerTelegramIpcHandlers,
      telegramDeps: { id: 'telegram' },
      registerCloudSyncIpcHandlers,
      cloudSyncDeps: { id: 'cloud-sync' },
    });

    expect(subscribeTelegramStatus).toHaveBeenCalledTimes(1);
    expect(subscribeUpdates).toHaveBeenCalledTimes(1);
    expect(subscribeAutomationStatus).toHaveBeenCalledTimes(1);
    expect(registerAutomationsIpcHandlers).toHaveBeenCalledWith(ipcMain, { id: 'automation' });
    expect(registerAppShellIpcHandlers).toHaveBeenCalledWith({
      ipcMain,
      deps: { id: 'app-shell' },
    });
    expect(registerVaultWorkspaceIpcHandlers).toHaveBeenCalledWith({
      ipcMain,
      deps: { id: 'vault-workspace' },
    });
    expect(registerSearchIpcHandlers).toHaveBeenCalledWith({
      ipcMain,
      deps: { id: 'search' },
    });
    expect(registerMemoryIpcHandlers).toHaveBeenCalledWith({
      ipcMain,
      memoryIpcDeps: { id: 'memory' },
    });
    expect(registerAgentIpcHandlers).toHaveBeenCalledWith({
      ipcMain,
      deps: { id: 'agent' },
    });
    expect(registerOllamaIpcHandlers).toHaveBeenCalledWith({
      ipcMain,
      deps: { id: 'ollama' },
    });
    expect(registerMembershipIpcHandlers).toHaveBeenCalledWith({
      ipcMain,
      deps: { id: 'membership' },
    });
    expect(registerTelegramIpcHandlers).toHaveBeenCalledWith({
      ipcMain,
      deps: { id: 'telegram' },
    });
    expect(registerCloudSyncIpcHandlers).toHaveBeenCalledWith({
      ipcMain,
      deps: { id: 'cloud-sync' },
    });

    const telegramListener = subscribeTelegramStatus.mock.calls[0]?.[0];
    telegramListener?.({ connected: true });
    const updatesListener = subscribeUpdates.mock.calls[0]?.[0];
    updatesListener?.({ status: 'ready' }, { autoDownload: true });
    const automationListener = subscribeAutomationStatus.mock.calls[0]?.[0];
    automationListener?.({ id: 'run-1' });

    expect(broadcastToAllWindows).toHaveBeenNthCalledWith(1, 'telegram:status-changed', {
      connected: true,
    });
    expect(broadcastToAllWindows).toHaveBeenNthCalledWith(2, 'updates:state-changed', {
      state: { status: 'ready' },
      settings: { autoDownload: true },
    });
    expect(broadcastToAllWindows).toHaveBeenNthCalledWith(3, 'automations:status-changed', {
      id: 'run-1',
    });
  });

  it('does not double-register search handlers when composing vault/workspace and search registrars', () => {
    const seenChannels = new Set<string>();
    const ipcMain = {
      handle: vi.fn((channel: string) => {
        if (seenChannels.has(channel)) {
          throw new Error(`duplicate handler: ${channel}`);
        }
        seenChannels.add(channel);
      }),
    };

    expect(() =>
      registerIpcComposition({
        ipcMain,
        subscribeTelegramStatus: vi.fn(),
        subscribeUpdates: vi.fn(),
        subscribeAutomationStatus: vi.fn(),
        broadcastToAllWindows: vi.fn(),
        registerAutomationsIpcHandlers: vi.fn(),
        automationService: { id: 'automation' },
        registerAppShellIpcHandlers: vi.fn(),
        appShellDeps: { id: 'app-shell' },
        registerVaultWorkspaceIpcHandlers,
        vaultWorkspaceDeps: {
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
        registerSearchIpcHandlers,
        searchDeps: {
          searchIndexService: {
            query: vi.fn(() => []),
            rebuild: vi.fn(),
            getStatus: vi.fn(() => ({ ready: true })),
          },
        },
        registerMemoryIpcHandlers: vi.fn(),
        memoryIpcDeps: { id: 'memory' },
        registerAgentIpcHandlers: vi.fn(),
        agentDeps: { id: 'agent' },
        registerOllamaIpcHandlers: vi.fn(),
        ollamaDeps: { id: 'ollama' },
        registerMembershipIpcHandlers: vi.fn(),
        membershipDeps: { id: 'membership' },
        registerTelegramIpcHandlers: vi.fn(),
        telegramDeps: { id: 'telegram' },
        registerCloudSyncIpcHandlers: vi.fn(),
        cloudSyncDeps: { id: 'cloud-sync' },
      })
    ).not.toThrow();

    expect(seenChannels).toContain('search:query');
    expect(seenChannels).toContain('search:rebuild');
    expect(seenChannels).toContain('search:getStatus');
  });
});

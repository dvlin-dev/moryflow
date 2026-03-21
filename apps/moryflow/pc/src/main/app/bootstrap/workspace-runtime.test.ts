import { describe, expect, it, vi } from 'vitest';

import { createWorkspaceRuntime } from './workspace-runtime.js';

describe('createWorkspaceRuntime', () => {
  it('resets scoped services and clears workspace cache', async () => {
    const cloudSyncEngine = { stop: vi.fn() };
    const memoryIndexingEngine = { stop: vi.fn() };
    const searchIndexService = { resetScope: vi.fn() };
    const setQuickChatSessionId = vi.fn();
    const quickChatWindowController = { setSessionId: vi.fn() };
    const workspaceDocRegistry = { clearCache: vi.fn() };

    const runtime = createWorkspaceRuntime({
      cloudSyncEngine,
      memoryIndexingEngine,
      searchIndexService,
      setQuickChatSessionId,
      getQuickChatWindowController: () => quickChatWindowController,
      getStoredVault: vi.fn(async () => ({ path: '/vaults/main' })),
      workspaceDocRegistry,
      resolveCurrentChatSessionScope: vi.fn(async () => null),
      getQuickChatSessionId: vi.fn(() => null),
      chatSessionStore: {
        getSummaryInScope: vi.fn(),
        create: vi.fn(() => ({ id: 'session-1' })),
      },
      ensureDefaultWorkspace: vi.fn(async () => null),
      resolveChatSessionProfileKey: vi.fn(async () => null),
    });

    await runtime.resetWorkspaceScopedRuntimeState();

    expect(cloudSyncEngine.stop).toHaveBeenCalledTimes(1);
    expect(memoryIndexingEngine.stop).toHaveBeenCalledTimes(1);
    expect(searchIndexService.resetScope).toHaveBeenCalledTimes(1);
    expect(setQuickChatSessionId).toHaveBeenCalledWith(null);
    expect(quickChatWindowController.setSessionId).toHaveBeenCalledWith(null);
    expect(workspaceDocRegistry.clearCache).toHaveBeenCalledWith('/vaults/main');
  });

  it('reuses visible quick chat session in current scope', async () => {
    const getSummaryInScope = vi.fn(() => ({ id: 'session-visible' }));
    const create = vi.fn();

    const runtime = createWorkspaceRuntime({
      cloudSyncEngine: { stop: vi.fn() },
      memoryIndexingEngine: { stop: vi.fn() },
      searchIndexService: { resetScope: vi.fn() },
      setQuickChatSessionId: vi.fn(),
      getQuickChatWindowController: () => ({ setSessionId: vi.fn() }),
      getStoredVault: vi.fn(async () => ({ path: '/vaults/main' })),
      workspaceDocRegistry: { clearCache: vi.fn() },
      resolveCurrentChatSessionScope: vi.fn(async () => ({
        vaultPath: '/vaults/main',
        profileKey: 'profile-1',
      })),
      getQuickChatSessionId: vi.fn(() => 'session-visible'),
      chatSessionStore: {
        getSummaryInScope,
        create,
      },
      ensureDefaultWorkspace: vi.fn(async () => null),
      resolveChatSessionProfileKey: vi.fn(async () => 'profile-1'),
    });

    await expect(runtime.ensureQuickChatSessionId()).resolves.toBe('session-visible');
    expect(getSummaryInScope).toHaveBeenCalledWith('session-visible', {
      vaultPath: '/vaults/main',
      profileKey: 'profile-1',
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('uses the latest quick chat controller when resetting scoped runtime', async () => {
    const latestController = { setSessionId: vi.fn() };

    const runtime = createWorkspaceRuntime({
      cloudSyncEngine: { stop: vi.fn() },
      memoryIndexingEngine: { stop: vi.fn() },
      searchIndexService: { resetScope: vi.fn() },
      setQuickChatSessionId: vi.fn(),
      getQuickChatWindowController: () => latestController,
      getStoredVault: vi.fn(async () => ({ path: '/vaults/main' })),
      workspaceDocRegistry: { clearCache: vi.fn() },
      resolveCurrentChatSessionScope: vi.fn(async () => null),
      getQuickChatSessionId: vi.fn(() => null),
      chatSessionStore: {
        getSummaryInScope: vi.fn(),
        create: vi.fn(() => ({ id: 'session-1' })),
      },
      ensureDefaultWorkspace: vi.fn(async () => null),
      resolveChatSessionProfileKey: vi.fn(async () => null),
    });

    await runtime.resetWorkspaceScopedRuntimeState();

    expect(latestController.setSessionId).toHaveBeenCalledWith(null);
  });
});

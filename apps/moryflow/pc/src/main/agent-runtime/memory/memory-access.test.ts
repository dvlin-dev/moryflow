/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import { resolveMemoryAccess, type MemoryAccessDeps } from './memory-access';

const makeDeps = (overrides: Partial<MemoryAccessDeps> = {}): MemoryAccessDeps => ({
  getActiveContext: vi.fn().mockResolvedValue({
    loggedIn: true,
    activeVault: {
      id: 'vault-1',
      name: 'Vault',
      path: '/vault',
      addedAt: 1,
    },
    profile: {
      workspaceId: 'ws-active',
      memoryProjectId: 'project-1',
      syncVaultId: 'sync-vault-1',
      syncEnabled: true,
      lastResolvedAt: '2026-03-21T00:00:00.000Z',
    },
  }),
  getSessionSummary: vi.fn().mockReturnValue({
    profileKey: 'user-1:client-workspace-1',
    vaultPath: '/vault',
  }),
  getProfile: vi.fn().mockReturnValue({
    workspaceId: 'ws-session',
    memoryProjectId: 'project-1',
    syncVaultId: 'sync-vault-1',
    syncEnabled: true,
    lastResolvedAt: '2026-03-21T00:00:00.000Z',
  }),
  isAbsolutePath: vi.fn().mockImplementation((value: string) => value.startsWith('/')),
  ...overrides,
});

describe('resolveMemoryAccess', () => {
  it('returns disabled login_required when user is not logged in', async () => {
    const deps = makeDeps({
      getActiveContext: vi.fn().mockResolvedValue({
        loggedIn: false,
        activeVault: {
          id: 'vault-1',
          name: 'Vault',
          path: '/vault',
          addedAt: 1,
        },
        profile: null,
      }),
    });

    await expect(resolveMemoryAccess(deps, 'chat-1')).resolves.toEqual({
      state: 'login_required',
      workspaceId: null,
      vaultPath: null,
      profileKey: null,
    });
  });

  it('uses session-bound profile when available', async () => {
    const deps = makeDeps();

    await expect(resolveMemoryAccess(deps, 'chat-1')).resolves.toEqual({
      state: 'enabled',
      workspaceId: 'ws-session',
      vaultPath: '/vault',
      profileKey: 'user-1:client-workspace-1',
    });
  });

  it('fails closed when there is no chat-bound session', async () => {
    const deps = makeDeps({
      getSessionSummary: vi.fn().mockReturnValue({
        profileKey: null,
        vaultPath: '/vault',
      }),
    });

    await expect(resolveMemoryAccess(deps)).resolves.toEqual({
      state: 'scope_unavailable',
      workspaceId: null,
      vaultPath: null,
      profileKey: null,
    });
  });

  it('fails closed when chat-bound session scope cannot be resolved', async () => {
    const deps = makeDeps({
      getSessionSummary: vi.fn().mockReturnValue({
        profileKey: null,
        vaultPath: '/vault',
      }),
    });

    await expect(resolveMemoryAccess(deps, 'chat-1')).resolves.toEqual({
      state: 'scope_unavailable',
      workspaceId: null,
      vaultPath: null,
      profileKey: null,
    });
  });

  it('keeps access enabled but clears vaultPath when session profile resolves without session vault', async () => {
    const deps = makeDeps({
      getSessionSummary: vi.fn().mockReturnValue({
        profileKey: 'user-1:client-workspace-1',
        vaultPath: null,
      }),
    });

    await expect(resolveMemoryAccess(deps, 'chat-1')).resolves.toEqual({
      state: 'enabled',
      workspaceId: 'ws-session',
      vaultPath: null,
      profileKey: 'user-1:client-workspace-1',
    });
  });

  it('returns profile_unavailable when logged in but no profile can be resolved', async () => {
    const deps = makeDeps({
      getActiveContext: vi.fn().mockResolvedValue({
        loggedIn: true,
        activeVault: {
          id: 'vault-1',
          name: 'Vault',
          path: '/vault',
          addedAt: 1,
        },
        profile: null,
      }),
      getSessionSummary: vi.fn().mockReturnValue({
        profileKey: 'user-1:client-workspace-1',
        vaultPath: '/vault',
      }),
      getProfile: vi.fn().mockReturnValue(null),
    });

    await expect(resolveMemoryAccess(deps, 'chat-1')).resolves.toEqual({
      state: 'scope_unavailable',
      workspaceId: null,
      vaultPath: null,
      profileKey: 'user-1:client-workspace-1',
    });
  });

  it('returns workspace_unavailable when there is no active vault', async () => {
    const deps = makeDeps({
      getActiveContext: vi.fn().mockResolvedValue({
        loggedIn: true,
        activeVault: null,
        profile: null,
      }),
    });

    await expect(resolveMemoryAccess(deps, 'chat-1')).resolves.toEqual({
      state: 'workspace_unavailable',
      workspaceId: null,
      vaultPath: null,
      profileKey: null,
    });
  });
});

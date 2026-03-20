/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import { resolveMemoryToolCapability, type MemoryToolCapabilityDeps } from './memory-capability';

const makeDeps = (overrides: Partial<MemoryToolCapabilityDeps> = {}): MemoryToolCapabilityDeps => ({
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

describe('resolveMemoryToolCapability', () => {
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

    await expect(resolveMemoryToolCapability(deps, 'chat-1')).resolves.toEqual({
      state: 'login_required',
      canRead: false,
      canWrite: false,
      canReadKnowledgeFile: false,
      workspaceId: null,
      vaultPath: null,
      profileKey: null,
    });
  });

  it('uses session-bound profile for read/write when available', async () => {
    const deps = makeDeps();

    await expect(resolveMemoryToolCapability(deps, 'chat-1')).resolves.toEqual({
      state: 'enabled',
      canRead: true,
      canWrite: true,
      canReadKnowledgeFile: true,
      workspaceId: 'ws-session',
      vaultPath: '/vault',
      profileKey: 'user-1:client-workspace-1',
    });
  });

  it('falls back to active profile for read-only access only when there is no chat-bound session', async () => {
    const deps = makeDeps({
      getSessionSummary: vi.fn().mockReturnValue({
        profileKey: null,
        vaultPath: '/vault',
      }),
    });

    await expect(resolveMemoryToolCapability(deps)).resolves.toEqual({
      state: 'enabled',
      canRead: true,
      canWrite: false,
      canReadKnowledgeFile: true,
      workspaceId: 'ws-active',
      vaultPath: '/vault',
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

    await expect(resolveMemoryToolCapability(deps, 'chat-1')).resolves.toEqual({
      state: 'profile_unavailable',
      canRead: false,
      canWrite: false,
      canReadKnowledgeFile: false,
      workspaceId: null,
      vaultPath: '/vault',
      profileKey: null,
    });
  });

  it('disables knowledge_read when session profile resolves but vault path is missing', async () => {
    const deps = makeDeps({
      getSessionSummary: vi.fn().mockReturnValue({
        profileKey: 'user-1:client-workspace-1',
        vaultPath: null,
      }),
    });

    await expect(resolveMemoryToolCapability(deps, 'chat-1')).resolves.toEqual({
      state: 'enabled',
      canRead: true,
      canWrite: true,
      canReadKnowledgeFile: false,
      workspaceId: 'ws-session',
      vaultPath: '/vault',
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

    await expect(resolveMemoryToolCapability(deps, 'chat-1')).resolves.toEqual({
      state: 'profile_unavailable',
      canRead: false,
      canWrite: false,
      canReadKnowledgeFile: false,
      workspaceId: null,
      vaultPath: '/vault',
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

    await expect(resolveMemoryToolCapability(deps, 'chat-1')).resolves.toEqual({
      state: 'workspace_unavailable',
      canRead: false,
      canWrite: false,
      canReadKnowledgeFile: false,
      workspaceId: null,
      vaultPath: null,
      profileKey: null,
    });
  });
});

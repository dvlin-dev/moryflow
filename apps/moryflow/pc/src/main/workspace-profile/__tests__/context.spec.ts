/* @vitest-environment node */
import { describe, expect, it, vi } from 'vitest';

const { getActiveVaultInfoMock } = vi.hoisted(() => ({
  getActiveVaultInfoMock: vi.fn(async () => ({
    id: 'vault-local-1',
    name: 'Workspace',
    path: '/vault',
    addedAt: 1,
  })),
}));

const { getMembershipConfigMock } = vi.hoisted(() => ({
  getMembershipConfigMock: vi.fn(() => ({
    token: 'token-1',
  })),
}));

const { fetchCurrentUserIdMock } = vi.hoisted(() => ({
  fetchCurrentUserIdMock: vi.fn(async () => 'user-1'),
}));

const { ensureWorkspaceIdentityMock } = vi.hoisted(() => ({
  ensureWorkspaceIdentityMock: vi.fn(async () => ({
    clientWorkspaceId: 'workspace-client-1',
    createdAt: '2026-03-14T00:00:00.000Z',
  })),
}));

const { resolveWorkspaceMock } = vi.hoisted(() => ({
  resolveWorkspaceMock: vi.fn(async () => ({
    workspaceId: 'workspace-1',
    memoryProjectId: 'workspace-1',
    syncVaultId: 'vault-1',
    syncEnabled: true,
  })),
}));

const {
  getProfileMock,
  saveProfileMock,
} = vi.hoisted(() => ({
  getProfileMock: vi.fn(() => null),
  saveProfileMock: vi.fn(),
}));

vi.mock('../../membership-bridge.js', () => ({
  membershipBridge: {
    getConfig: getMembershipConfigMock,
  },
}));

vi.mock('../../vault/index.js', () => ({
  getActiveVaultInfo: getActiveVaultInfoMock,
}));

vi.mock('../../cloud-sync/user-info.js', () => ({
  fetchCurrentUserId: fetchCurrentUserIdMock,
}));

vi.mock('../../workspace-meta/identity.js', () => ({
  ensureWorkspaceIdentity: ensureWorkspaceIdentityMock,
}));

vi.mock('../api/client.js', () => ({
  workspaceProfileApi: {
    resolveWorkspace: resolveWorkspaceMock,
  },
}));

vi.mock('../service.js', () => ({
  workspaceProfileService: {
    getProfile: getProfileMock,
    saveProfile: saveProfileMock,
  },
  buildWorkspaceProfileKey: (userId: string, clientWorkspaceId: string) =>
    `${userId}:${clientWorkspaceId}`,
}));

import { resolveActiveWorkspaceProfileContext } from '../context.js';

describe('resolveActiveWorkspaceProfileContext', () => {
  it('uses the real getActiveVaultInfo in default deps', async () => {
    const result = await resolveActiveWorkspaceProfileContext();

    expect(getActiveVaultInfoMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        loggedIn: true,
        userId: 'user-1',
        activeVault: expect.objectContaining({
          path: '/vault',
        }),
        identity: expect.objectContaining({
          clientWorkspaceId: 'workspace-client-1',
        }),
        profile: expect.objectContaining({
          workspaceId: 'workspace-1',
        }),
      }),
    );
  });
});

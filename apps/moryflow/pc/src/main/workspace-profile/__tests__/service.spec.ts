import { beforeEach, describe, expect, it } from 'vitest';
import {
  createWorkspaceProfileService,
  type WorkspaceProfileStoreLike,
} from '../service.js';

describe('workspace-profile service', () => {
  let state: Record<string, unknown>;
  let store: WorkspaceProfileStoreLike;

  beforeEach(() => {
    state = {};
    store = {
      get(key) {
        return (state[key] as never) ?? null;
      },
      set(key, value) {
        state[key] = value;
      },
      delete(key) {
        delete state[key];
      },
    };
  });

  it('同一工作区不同账号使用不同 profile key', () => {
    const service = createWorkspaceProfileService(store);

    service.saveProfile('user-a', 'workspace-marker', {
      workspaceId: 'workspace-a',
      memoryProjectId: 'workspace-a',
      syncVaultId: 'vault-a',
      syncEnabled: true,
      lastResolvedAt: '2026-03-14T00:00:00.000Z',
    });
    service.saveProfile('user-b', 'workspace-marker', {
      workspaceId: 'workspace-b',
      memoryProjectId: 'workspace-b',
      syncVaultId: null,
      syncEnabled: false,
      lastResolvedAt: '2026-03-14T00:01:00.000Z',
    });

    expect(service.getProfile('user-a', 'workspace-marker')).toEqual({
      workspaceId: 'workspace-a',
      memoryProjectId: 'workspace-a',
      syncVaultId: 'vault-a',
      syncEnabled: true,
      lastResolvedAt: '2026-03-14T00:00:00.000Z',
    });
    expect(service.getProfile('user-b', 'workspace-marker')).toEqual({
      workspaceId: 'workspace-b',
      memoryProjectId: 'workspace-b',
      syncVaultId: null,
      syncEnabled: false,
      lastResolvedAt: '2026-03-14T00:01:00.000Z',
    });
  });

  it('同一账号重复打开时复用同一个 profile', () => {
    const service = createWorkspaceProfileService(store);

    service.saveProfile('user-a', 'workspace-marker', {
      workspaceId: 'workspace-a',
      memoryProjectId: 'workspace-a',
      syncVaultId: null,
      syncEnabled: false,
      lastResolvedAt: '2026-03-14T00:00:00.000Z',
    });

    expect(service.getProfile('user-a', 'workspace-marker')).toEqual({
      workspaceId: 'workspace-a',
      memoryProjectId: 'workspace-a',
      syncVaultId: null,
      syncEnabled: false,
      lastResolvedAt: '2026-03-14T00:00:00.000Z',
    });
  });
});

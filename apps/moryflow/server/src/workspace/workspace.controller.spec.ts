import { describe, expect, it, vi, type MockedFunction } from 'vitest';
import { WorkspaceController } from './workspace.controller';
import type { WorkspaceService } from './workspace.service';
import type { CurrentUserDto } from '../types';

type WorkspaceControllerServiceMock = {
  resolveWorkspace: MockedFunction<WorkspaceService['resolveWorkspace']>;
};

describe('WorkspaceController', () => {
  const user: CurrentUserDto = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Demo',
    subscriptionTier: 'pro',
    isAdmin: false,
  };

  it('delegates workspace resolve to the service with the current user id', async () => {
    const service: WorkspaceControllerServiceMock = {
      resolveWorkspace: vi.fn().mockResolvedValue({
        workspaceId: 'c54af42d-54f6-4322-8d45-4e74e969ca07',
        memoryProjectId: 'c54af42d-54f6-4322-8d45-4e74e969ca07',
        syncVaultId: null,
        syncEnabled: false,
      }),
    };
    const controller = new WorkspaceController(
      service as unknown as WorkspaceService,
    );

    const result = await controller.resolveWorkspace(user, {
      clientWorkspaceId: 'workspace-marker-1',
      name: 'Workspace',
      syncRequested: false,
    });

    expect(service.resolveWorkspace).toHaveBeenCalledWith('user-1', {
      clientWorkspaceId: 'workspace-marker-1',
      name: 'Workspace',
      syncRequested: false,
    });
    expect(result.syncEnabled).toBe(false);
  });
});

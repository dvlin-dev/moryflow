import { beforeEach, describe, expect, it } from 'vitest';
import { WorkspaceService } from './workspace.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let prismaMock: MockPrismaService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: MockPrismaService) => Promise<unknown>) =>
        callback(prismaMock),
    );
    service = new WorkspaceService(prismaMock as never);
  });

  it('returns the same workspaceId when the same user/clientWorkspaceId resolves twice', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: '4dc3d7b1-193f-41f5-8f81-4bceca7340f6',
      userId: 'user-1',
      clientWorkspaceId: 'workspace-marker-1',
      name: 'Workspace',
      createdAt: new Date(),
      updatedAt: new Date(),
      syncVault: null,
    });

    const first = await service.resolveWorkspace('user-1', {
      clientWorkspaceId: 'workspace-marker-1',
      name: 'Workspace',
      syncRequested: false,
    });
    const second = await service.resolveWorkspace('user-1', {
      clientWorkspaceId: 'workspace-marker-1',
      name: 'Workspace',
      syncRequested: false,
    });

    expect(first.workspaceId).toBe(second.workspaceId);
    expect(first.syncVaultId).toBeNull();
    expect(prismaMock.workspace.create).not.toHaveBeenCalled();
  });

  it('creates a sync vault when syncRequested is true and the workspace has no transport yet', async () => {
    prismaMock.workspace.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'c54af42d-54f6-4322-8d45-4e74e969ca07',
        userId: 'user-1',
        clientWorkspaceId: 'workspace-marker-2',
        name: 'Workspace B',
        createdAt: new Date(),
        updatedAt: new Date(),
        syncVault: null,
      });
    prismaMock.workspace.create.mockResolvedValue({
      id: 'c54af42d-54f6-4322-8d45-4e74e969ca07',
      userId: 'user-1',
      clientWorkspaceId: 'workspace-marker-2',
      name: 'Workspace B',
      createdAt: new Date(),
      updatedAt: new Date(),
      syncVault: null,
    });
    prismaMock.vault.create.mockResolvedValue({
      id: '9fe9581d-7687-420b-96d9-a2f718bbf1a4',
      userId: 'user-1',
      workspaceId: 'c54af42d-54f6-4322-8d45-4e74e969ca07',
      name: 'Workspace B',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.resolveWorkspace('user-1', {
      clientWorkspaceId: 'workspace-marker-2',
      name: 'Workspace B',
      syncRequested: true,
    });

    expect(prismaMock.workspace.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        clientWorkspaceId: 'workspace-marker-2',
        name: 'Workspace B',
      },
      include: {
        syncVault: true,
      },
    });
    expect(prismaMock.vault.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        workspaceId: 'c54af42d-54f6-4322-8d45-4e74e969ca07',
        name: 'Workspace B',
      },
    });
    expect(result).toEqual({
      workspaceId: 'c54af42d-54f6-4322-8d45-4e74e969ca07',
      memoryProjectId: 'c54af42d-54f6-4322-8d45-4e74e969ca07',
      syncVaultId: '9fe9581d-7687-420b-96d9-a2f718bbf1a4',
      syncEnabled: true,
    });
  });

  it('re-reads the workspace when concurrent creation hits a unique constraint', async () => {
    const existingWorkspace = {
      id: 'workspace-existing',
      userId: 'user-1',
      clientWorkspaceId: 'workspace-marker-3',
      name: 'Workspace C',
      createdAt: new Date(),
      updatedAt: new Date(),
      syncVault: null,
    };

    prismaMock.workspace.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingWorkspace);
    prismaMock.workspace.create.mockRejectedValueOnce({ code: 'P2002' });

    const result = await service.resolveWorkspace('user-1', {
      clientWorkspaceId: 'workspace-marker-3',
      name: 'Workspace C',
      syncRequested: false,
    });

    expect(prismaMock.workspace.findUnique).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      workspaceId: 'workspace-existing',
      memoryProjectId: 'workspace-existing',
      syncVaultId: null,
      syncEnabled: false,
    });
  });

  it('re-reads the sync vault when concurrent creation hits a unique constraint', async () => {
    const workspace = {
      id: 'workspace-existing',
      userId: 'user-1',
      clientWorkspaceId: 'workspace-marker-4',
      name: 'Workspace D',
      createdAt: new Date(),
      updatedAt: new Date(),
      syncVault: null,
    };
    const existingVault = {
      id: 'vault-existing',
      userId: 'user-1',
      workspaceId: 'workspace-existing',
      name: 'Workspace D',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.workspace.findUnique.mockResolvedValue(workspace);
    prismaMock.vault.create.mockRejectedValueOnce({ code: 'P2002' });
    prismaMock.vault.findUnique.mockResolvedValue(existingVault);

    const result = await service.resolveWorkspace('user-1', {
      clientWorkspaceId: 'workspace-marker-4',
      name: 'Workspace D',
      syncRequested: true,
    });

    expect(prismaMock.vault.findUnique).toHaveBeenCalledWith({
      where: {
        workspaceId: 'workspace-existing',
      },
    });
    expect(result).toEqual({
      workspaceId: 'workspace-existing',
      memoryProjectId: 'workspace-existing',
      syncVaultId: 'vault-existing',
      syncEnabled: true,
    });
  });
});

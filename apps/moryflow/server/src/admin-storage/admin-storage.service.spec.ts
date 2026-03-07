import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminStorageService } from './admin-storage.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';
import type { PrismaService } from '../prisma';
import type { StorageClient } from '../storage/storage.client';

type ExtendedPrismaMock = MockPrismaService & {
  vault: ReturnType<typeof createModelMock>;
  vaultDevice: ReturnType<typeof createModelMock>;
};

function createModelMock() {
  return {
    findUnique: vi.fn().mockResolvedValue(undefined),
    findFirst: vi.fn().mockResolvedValue(undefined),
    findMany: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue(undefined),
    createMany: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    updateMany: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteMany: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(undefined),
    aggregate: vi.fn().mockResolvedValue(undefined),
    groupBy: vi.fn().mockResolvedValue(undefined),
  };
}

describe('AdminStorageService', () => {
  let prisma: ExtendedPrismaMock;
  let storageClient: { deleteFiles: ReturnType<typeof vi.fn> };
  let service: AdminStorageService;

  beforeEach(() => {
    prisma = createPrismaMock() as ExtendedPrismaMock;
    prisma.vault = createModelMock();
    prisma.vaultDevice = createModelMock();
    storageClient = {
      deleteFiles: vi.fn().mockResolvedValue(undefined),
    };
    service = new AdminStorageService(
      prisma as unknown as PrismaService,
      storageClient as unknown as StorageClient,
    );
  });

  it('getStats counts active sync users from vault truth instead of placeholder usage rows', async () => {
    prisma.syncFile.aggregate.mockResolvedValue({
      _sum: {
        size: 3072,
      },
    });
    prisma.vault.groupBy.mockResolvedValue([
      { userId: 'user-active', _count: { userId: 1 } },
    ]);
    prisma.vault.count.mockResolvedValue(2);
    prisma.syncFile.count.mockResolvedValue(3);
    prisma.vaultDevice.count.mockResolvedValue(4);

    const result = await service.getStats();

    expect(result).toEqual({
      storage: {
        totalUsed: 3072,
        userCount: 1,
        vaultCount: 2,
        fileCount: 3,
        deviceCount: 4,
      },
    });
    expect(prisma.userStorageUsage.aggregate).not.toHaveBeenCalled();
  });

  it('getVaultList reports only live fileCount even when soft-deleted rows still exist', async () => {
    prisma.vault.findMany.mockResolvedValue([
      {
        id: 'vault-1',
        name: 'Vault 1',
        userId: 'user-1',
        createdAt: new Date('2026-03-07T00:00:00.000Z'),
        user: {
          email: 'user@example.com',
          name: 'User',
        },
        _count: {
          files: 5,
          devices: 2,
        },
      },
    ]);
    prisma.vault.count.mockResolvedValue(1);
    prisma.syncFile.groupBy.mockResolvedValue([
      {
        vaultId: 'vault-1',
        _count: { id: 2 },
        _sum: { size: 100 },
      },
    ]);

    const result = await service.getVaultList({
      limit: 20,
      offset: 0,
    });

    expect(result).toEqual({
      vaults: [
        {
          id: 'vault-1',
          name: 'Vault 1',
          userId: 'user-1',
          userEmail: 'user@example.com',
          userName: 'User',
          fileCount: 2,
          totalSize: 100,
          deviceCount: 2,
          createdAt: '2026-03-07T00:00:00.000Z',
        },
      ],
      total: 1,
    });
  });

  it('getUserStorageList is sourced from real vault users and defaults missing usage to zero', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        email: 'alpha@example.com',
        name: 'Alpha',
        subscription: { tier: 'starter' },
      },
      {
        id: 'user-2',
        email: 'beta@example.com',
        name: 'Beta',
        subscription: null,
      },
    ]);
    prisma.user.count.mockResolvedValue(2);
    prisma.userStorageUsage.findMany.mockResolvedValue([
      {
        userId: 'user-1',
        storageUsed: BigInt(2048),
      },
    ]);
    prisma.vault.groupBy.mockResolvedValue([
      { userId: 'user-1', _count: { id: 1 } },
      { userId: 'user-2', _count: { id: 2 } },
    ]);

    const result = await service.getUserStorageList({
      limit: 20,
      offset: 0,
    });

    expect(result).toEqual({
      users: [
        {
          userId: 'user-1',
          email: 'alpha@example.com',
          name: 'Alpha',
          subscriptionTier: 'starter',
          storageUsed: 2048,
          storageLimit: 500 * 1024 * 1024,
          vaultCount: 1,
        },
        {
          userId: 'user-2',
          email: 'beta@example.com',
          name: 'Beta',
          subscriptionTier: 'free',
          storageUsed: 0,
          storageLimit: 50 * 1024 * 1024,
          vaultCount: 2,
        },
      ],
      total: 2,
    });
    expect(prisma.userStorageUsage.count).not.toHaveBeenCalled();
  });

  it('getUserStorageDetail reports live fileCount per vault instead of raw relation count', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      subscription: { tier: 'pro' },
    });
    prisma.userStorageUsage.findUnique.mockResolvedValue({
      userId: 'user-1',
      storageUsed: BigInt(4096),
    });
    prisma.vault.findMany.mockResolvedValue([
      {
        id: 'vault-1',
        name: 'Vault 1',
        createdAt: new Date('2026-03-07T00:00:00.000Z'),
        _count: {
          files: 5,
          devices: 1,
        },
      },
    ]);
    prisma.syncFile.groupBy.mockResolvedValue([
      {
        vaultId: 'vault-1',
        _count: { id: 2 },
        _sum: { size: 512 },
      },
    ]);

    const result = await service.getUserStorageDetail('user-1');

    expect(result).toEqual({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        subscriptionTier: 'pro',
      },
      usage: {
        storageUsed: 4096,
        storageLimit: 10 * 1024 * 1024 * 1024,
      },
      vaults: [
        {
          id: 'vault-1',
          name: 'Vault 1',
          fileCount: 2,
          totalSize: 512,
          deviceCount: 1,
          createdAt: '2026-03-07T00:00:00.000Z',
        },
      ],
    });
  });
});

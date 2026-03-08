import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { QuotaService } from './quota.service';
import { PrismaService } from '../prisma';
import {
  createPrismaMock,
  MockPrismaService,
} from '../testing/mocks/prisma.mock';

describe('QuotaService', () => {
  let service: QuotaService;
  let prismaMock: MockPrismaService;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    prismaMock.userStorageUsage.upsert.mockResolvedValue({
      storageUsed: BigInt(0),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<QuotaService>(QuotaService);
  });

  it('decrementStorageUsage 使用原子更新', async () => {
    await service.decrementStorageUsage('user-1', 1024);

    expect(prismaMock.userStorageUsage.upsert).toHaveBeenCalled();
    expect(prismaMock.$executeRaw).toHaveBeenCalled();
  });

  it('getUsage 只返回 storage/fileLimit/plan 合同', async () => {
    prismaMock.userStorageUsage.upsert.mockResolvedValue({
      userId: 'user-1',
      storageUsed: BigInt(1024),
    });

    const result = await service.getUsage('user-1', 'free');

    expect(result).toEqual({
      storage: {
        used: 1024,
        limit: 50 * 1024 * 1024,
        percentage: 0,
      },
      fileLimit: {
        maxFileSize: 1 * 1024 * 1024,
      },
      plan: 'free',
    });
  });
});

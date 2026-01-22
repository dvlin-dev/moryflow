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
      vectorizedCount: 0,
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

  it('decrementVectorizedCount 使用原子更新', async () => {
    await service.decrementVectorizedCount('user-1');

    expect(prismaMock.userStorageUsage.upsert).toHaveBeenCalled();
    expect(prismaMock.$executeRaw).toHaveBeenCalled();
  });
});

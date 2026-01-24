/**
 * EntityService 单元测试
 * 测试 Mem0 entities 的创建与查询
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { EntityService } from '../entity.service';
import type { EntityRepository } from '../entity.repository';
import type { VectorPrismaService } from '../../vector-prisma/vector-prisma.service';

type MockEntityRepository = {
  upsert: Mock;
};

type MockVectorPrisma = {
  memoxEntity: {
    findMany: Mock;
    groupBy: Mock;
  };
  memory: {
    count: Mock;
  };
};

describe('EntityService', () => {
  let service: EntityService;
  let mockRepository: MockEntityRepository;
  let mockVectorPrisma: MockVectorPrisma;

  beforeEach(() => {
    mockRepository = {
      upsert: vi.fn(),
    };

    mockVectorPrisma = {
      memoxEntity: {
        findMany: vi.fn(),
        groupBy: vi.fn(),
      },
      memory: {
        count: vi.fn(),
      },
    };

    service = new EntityService(
      mockRepository as unknown as EntityRepository,
      mockVectorPrisma as unknown as VectorPrismaService,
    );
  });

  it('should create user entity', async () => {
    mockRepository.upsert.mockResolvedValue({
      apiKeyId: 'api-key-1',
      type: 'user',
      entityId: 'user-1',
      metadata: { region: 'apac' },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    });

    const result = await service.createUser('api-key-1', {
      user_id: 'user-1',
      metadata: { region: 'apac' },
    });

    expect(mockRepository.upsert).toHaveBeenCalledWith('api-key-1', {
      type: 'user',
      entityId: 'user-1',
      metadata: { region: 'apac' },
      orgId: null,
      projectId: null,
    });
    expect(result).toEqual({
      user_id: 'user-1',
      metadata: { region: 'apac' },
    });
  });

  it('should list entities with total memories', async () => {
    mockVectorPrisma.memoxEntity.findMany.mockResolvedValue([
      {
        apiKeyId: 'api-key-1',
        type: 'user',
        entityId: 'user-1',
        name: null,
        metadata: null,
        orgId: null,
        projectId: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        apiKeyId: 'api-key-1',
        type: 'agent',
        entityId: 'agent-1',
        name: 'Agent Alpha',
        metadata: { tier: 'pro' },
        orgId: 'org-1',
        projectId: null,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
    ]);
    mockVectorPrisma.memory.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(7);

    const result = await service.listEntities('api-key-1', {});

    expect(result).toEqual([
      {
        id: 'user-1',
        name: 'user-1',
        type: 'user',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        total_memories: 3,
        owner: 'api-key-1',
        organization: null,
        metadata: null,
      },
      {
        id: 'agent-1',
        name: 'Agent Alpha',
        type: 'agent',
        created_at: '2024-01-02T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
        total_memories: 7,
        owner: 'api-key-1',
        organization: 'org-1',
        metadata: { tier: 'pro' },
      },
    ]);
  });

  it('should return entity type filters', async () => {
    mockVectorPrisma.memoxEntity.groupBy.mockResolvedValue([
      { type: 'user', _count: { type: 2 } },
      { type: 'agent', _count: { type: 1 } },
    ]);

    const result = await service.listEntityFilters('api-key-1');

    expect(result).toEqual([
      { type: 'user', count: 2 },
      { type: 'agent', count: 1 },
      { type: 'app', count: 0 },
      { type: 'run', count: 0 },
    ]);
  });
});

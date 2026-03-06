/**
 * ScopeRegistryService 单元测试
 * 测试作用域实体注册与聚合查询
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { Prisma } from '../../../generated/prisma-vector/client';
import { ScopeRegistryService } from '../scope-registry.service';
import type { ScopeRegistryRepository } from '../scope-registry.repository';
import type { VectorPrismaService } from '../../vector-prisma/vector-prisma.service';

type MockScopeRegistryRepository = {
  upsert: Mock;
};

type MockVectorPrisma = {
  scopeRegistry: {
    findMany: Mock;
    groupBy: Mock;
  };
  $queryRaw: Mock;
};

function toSqlText(query: unknown): string {
  const raw = query as {
    sql?: string;
    text?: string;
    strings?: string[];
  };

  if (typeof raw.sql === 'string') {
    return raw.sql;
  }
  if (typeof raw.text === 'string') {
    return raw.text;
  }
  if (Array.isArray(raw.strings)) {
    return raw.strings.join('?');
  }

  return '';
}

describe('ScopeRegistryService', () => {
  let service: ScopeRegistryService;
  let mockRepository: MockScopeRegistryRepository;
  let mockVectorPrisma: MockVectorPrisma;

  beforeEach(() => {
    mockRepository = {
      upsert: vi.fn(),
    };

    mockVectorPrisma = {
      scopeRegistry: {
        findMany: vi.fn(),
        groupBy: vi.fn(),
      },
      $queryRaw: vi.fn(),
    };

    service = new ScopeRegistryService(
      mockRepository as unknown as ScopeRegistryRepository,
      mockVectorPrisma as unknown as VectorPrismaService,
    );
  });

  it('should create user scope entry', async () => {
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

  it('should list scope entries with aggregated total memories', async () => {
    mockVectorPrisma.scopeRegistry.findMany.mockResolvedValue([
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

    mockVectorPrisma.$queryRaw
      .mockResolvedValueOnce([{ entityId: 'user-1', total: 3 }])
      .mockResolvedValueOnce([{ entityId: 'agent-1', total: 7 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

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
    expect(mockVectorPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    const firstQuery = mockVectorPrisma.$queryRaw.mock
      .calls[0]?.[0] as Prisma.Sql;
    expect(toSqlText(firstQuery)).toContain(
      '"expirationDate" IS NULL OR "expirationDate" > NOW()',
    );
  });

  it('should return scope type filters', async () => {
    mockVectorPrisma.scopeRegistry.groupBy.mockResolvedValue([
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

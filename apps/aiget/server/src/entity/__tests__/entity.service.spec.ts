/**
 * EntityService 单元测试
 *
 * 测试 Entity 模块的核心业务逻辑：
 * - 实体 CRUD
 * - 批量创建/更新
 * - 跨库查询（Console 用）
 * - 类型查询
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { EntityService } from '../entity.service';

// Mock 类型定义
type MockEntityRepository = {
  create: Mock;
  upsert: Mock;
  findMany: Mock;
  findById: Mock;
  findByType: Mock;
  deleteById: Mock;
};

type MockPrismaService = {
  apiKey: {
    findMany: Mock;
    count: Mock;
  };
};

type MockVectorPrismaService = {
  entity: {
    findMany: Mock;
    findUnique: Mock;
    count: Mock;
    delete: Mock;
  };
};

describe('EntityService', () => {
  let service: EntityService;
  let mockRepository: MockEntityRepository;
  let mockPrisma: MockPrismaService;
  let mockVectorPrisma: MockVectorPrismaService;

  const mockEntity = {
    id: 'entity-1',
    apiKeyId: 'api-key-1',
    userId: 'user-1',
    type: 'Person',
    name: 'John Doe',
    properties: { age: 30 },
    confidence: 0.95,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
      findById: vi.fn(),
      findByType: vi.fn(),
      deleteById: vi.fn(),
    };

    mockPrisma = {
      apiKey: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    mockVectorPrisma = {
      entity: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        delete: vi.fn(),
      },
    };

    service = new EntityService(
      mockRepository as any,
      mockPrisma as any,
      mockVectorPrisma as any,
    );
  });

  describe('create', () => {
    it('should create entity with default confidence', async () => {
      mockRepository.create.mockResolvedValue(mockEntity);

      const result = await service.create('api-key-1', {
        userId: 'user-1',
        type: 'Person',
        name: 'John Doe',
      });

      expect(mockRepository.create).toHaveBeenCalledWith('api-key-1', {
        userId: 'user-1',
        type: 'Person',
        name: 'John Doe',
        properties: null,
        confidence: 1.0,
      });
      expect(result).toEqual(mockEntity);
    });

    it('should create entity with custom properties and confidence', async () => {
      mockRepository.create.mockResolvedValue(mockEntity);

      await service.create('api-key-1', {
        userId: 'user-1',
        type: 'Person',
        name: 'John Doe',
        properties: { age: 30 },
        confidence: 0.95,
      });

      expect(mockRepository.create).toHaveBeenCalledWith('api-key-1', {
        userId: 'user-1',
        type: 'Person',
        name: 'John Doe',
        properties: { age: 30 },
        confidence: 0.95,
      });
    });
  });

  describe('upsert', () => {
    it('should upsert entity', async () => {
      mockRepository.upsert.mockResolvedValue(mockEntity);

      const result = await service.upsert('api-key-1', {
        userId: 'user-1',
        type: 'Person',
        name: 'John Doe',
      });

      expect(mockRepository.upsert).toHaveBeenCalledWith('api-key-1', {
        userId: 'user-1',
        type: 'Person',
        name: 'John Doe',
        properties: undefined,
        confidence: 1.0,
      });
      expect(result).toEqual(mockEntity);
    });
  });

  describe('createMany', () => {
    it('should create multiple entities using upsert', async () => {
      mockRepository.upsert
        .mockResolvedValueOnce({ ...mockEntity, id: 'entity-1' })
        .mockResolvedValueOnce({
          ...mockEntity,
          id: 'entity-2',
          name: 'Jane Doe',
        });

      const dtos = [
        { userId: 'user-1', type: 'Person', name: 'John Doe' },
        { userId: 'user-1', type: 'Person', name: 'Jane Doe' },
      ];

      const result = await service.createMany('api-key-1', dtos);

      expect(mockRepository.upsert).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty input', async () => {
      const result = await service.createMany('api-key-1', []);

      expect(result).toEqual([]);
      expect(mockRepository.upsert).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should list entities with default pagination', async () => {
      mockRepository.findMany.mockResolvedValue([mockEntity]);

      const result = await service.list('api-key-1', 'user-1');

      expect(mockRepository.findMany).toHaveBeenCalledWith('api-key-1', {
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
      expect(result).toEqual([mockEntity]);
    });

    it('should filter by type', async () => {
      mockRepository.findMany.mockResolvedValue([mockEntity]);

      await service.list('api-key-1', 'user-1', { type: 'Person' });

      expect(mockRepository.findMany).toHaveBeenCalledWith('api-key-1', {
        where: { userId: 'user-1', type: 'Person' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('should apply custom pagination', async () => {
      mockRepository.findMany.mockResolvedValue([mockEntity]);

      await service.list('api-key-1', 'user-1', { limit: 50, offset: 10 });

      expect(mockRepository.findMany).toHaveBeenCalledWith('api-key-1', {
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 10,
      });
    });
  });

  describe('getById', () => {
    it('should return entity by id', async () => {
      mockRepository.findById.mockResolvedValue(mockEntity);

      const result = await service.getById('api-key-1', 'entity-1');

      expect(mockRepository.findById).toHaveBeenCalledWith(
        'api-key-1',
        'entity-1',
      );
      expect(result).toEqual(mockEntity);
    });

    it('should return null when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.getById('api-key-1', 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getByType', () => {
    it('should return entities by type', async () => {
      const entities = [mockEntity, { ...mockEntity, id: 'entity-2' }];
      mockRepository.findByType.mockResolvedValue(entities);

      const result = await service.getByType('api-key-1', 'user-1', 'Person');

      expect(mockRepository.findByType).toHaveBeenCalledWith(
        'api-key-1',
        'user-1',
        'Person',
      );
      expect(result).toEqual(entities);
    });
  });

  describe('delete', () => {
    it('should delete entity by id', async () => {
      mockRepository.deleteById.mockResolvedValue(undefined);

      await service.delete('api-key-1', 'entity-1');

      expect(mockRepository.deleteById).toHaveBeenCalledWith(
        'api-key-1',
        'entity-1',
      );
    });
  });

  describe('listByUser (cross-database query)', () => {
    const mockApiKeys = [
      { id: 'api-key-1', name: 'Key 1' },
      { id: 'api-key-2', name: 'Key 2' },
    ];

    const mockEntities = [
      { ...mockEntity, apiKeyId: 'api-key-1' },
      { ...mockEntity, id: 'entity-2', apiKeyId: 'api-key-2' },
    ];

    it('should return entities with apiKeyName from cross-database query', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue(mockApiKeys);
      mockVectorPrisma.entity.findMany.mockResolvedValue(mockEntities);
      mockVectorPrisma.entity.count.mockResolvedValue(2);

      const result = await service.listByUser('platform-user-1', {
        limit: 20,
        offset: 0,
      });

      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { userId: 'platform-user-1' },
        select: { id: true, name: true },
      });
      expect(mockVectorPrisma.entity.findMany).toHaveBeenCalledWith({
        where: { apiKeyId: { in: ['api-key-1', 'api-key-2'] } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
      expect(result.entities).toHaveLength(2);
      expect(result.entities[0].apiKeyName).toBe('Key 1');
      expect(result.entities[1].apiKeyName).toBe('Key 2');
      expect(result.total).toBe(2);
    });

    it('should return empty result when user has no api keys', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([]);

      const result = await service.listByUser('platform-user-1');

      expect(result).toEqual({ entities: [], total: 0 });
      expect(mockVectorPrisma.entity.findMany).not.toHaveBeenCalled();
    });

    it('should filter by type', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue(mockApiKeys);
      mockVectorPrisma.entity.findMany.mockResolvedValue([mockEntities[0]]);
      mockVectorPrisma.entity.count.mockResolvedValue(1);

      await service.listByUser('platform-user-1', { type: 'Person' });

      expect(mockVectorPrisma.entity.findMany).toHaveBeenCalledWith({
        where: { apiKeyId: { in: ['api-key-1', 'api-key-2'] }, type: 'Person' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    it('should filter by specific apiKeyId', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([mockApiKeys[0]]);
      mockVectorPrisma.entity.findMany.mockResolvedValue([mockEntities[0]]);
      mockVectorPrisma.entity.count.mockResolvedValue(1);

      const result = await service.listByUser('platform-user-1', {
        apiKeyId: 'api-key-1',
      });

      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { id: 'api-key-1', userId: 'platform-user-1' },
        select: { id: true, name: true },
      });
      expect(result.entities).toHaveLength(1);
    });
  });

  describe('deleteByUser (cross-database ownership verification)', () => {
    it('should delete entity when ownership verified', async () => {
      mockVectorPrisma.entity.findUnique.mockResolvedValue({
        id: 'entity-1',
        apiKeyId: 'api-key-1',
      });
      mockPrisma.apiKey.count.mockResolvedValue(1);
      mockVectorPrisma.entity.delete.mockResolvedValue(undefined);

      await service.deleteByUser('platform-user-1', 'entity-1');

      expect(mockVectorPrisma.entity.findUnique).toHaveBeenCalledWith({
        where: { id: 'entity-1' },
        select: { id: true, apiKeyId: true },
      });
      expect(mockPrisma.apiKey.count).toHaveBeenCalledWith({
        where: { id: 'api-key-1', userId: 'platform-user-1' },
      });
      expect(mockVectorPrisma.entity.delete).toHaveBeenCalledWith({
        where: { id: 'entity-1' },
      });
    });

    it('should throw NotFoundException when entity not found', async () => {
      mockVectorPrisma.entity.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteByUser('platform-user-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when api key does not belong to user', async () => {
      mockVectorPrisma.entity.findUnique.mockResolvedValue({
        id: 'entity-1',
        apiKeyId: 'api-key-1',
      });
      mockPrisma.apiKey.count.mockResolvedValue(0);

      await expect(
        service.deleteByUser('wrong-user', 'entity-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTypesByUser', () => {
    it('should return distinct entity types', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        { id: 'api-key-1' },
        { id: 'api-key-2' },
      ]);
      mockVectorPrisma.entity.findMany.mockResolvedValue([
        { type: 'Company' },
        { type: 'Person' },
        { type: 'Product' },
      ]);

      const result = await service.getTypesByUser('platform-user-1');

      expect(mockVectorPrisma.entity.findMany).toHaveBeenCalledWith({
        where: { apiKeyId: { in: ['api-key-1', 'api-key-2'] } },
        select: { type: true },
        distinct: ['type'],
        orderBy: { type: 'asc' },
      });
      expect(result).toEqual(['Company', 'Person', 'Product']);
    });

    it('should return empty array when user has no api keys', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([]);

      const result = await service.getTypesByUser('platform-user-1');

      expect(result).toEqual([]);
      expect(mockVectorPrisma.entity.findMany).not.toHaveBeenCalled();
    });
  });
});

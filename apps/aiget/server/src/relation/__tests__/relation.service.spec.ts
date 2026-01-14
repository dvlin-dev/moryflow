/**
 * RelationService 单元测试
 *
 * 测试 Relation 模块的核心业务逻辑：
 * - 关系创建
 * - 批量创建
 * - 关系查询（列表、按实体、两实体之间）
 * - 关系删除
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { RelationService } from '../relation.service';

// Mock 类型定义
type MockRelationRepository = {
  create: Mock;
  findByType: Mock;
  listWithEntities: Mock;
  findByEntity: Mock;
  findBetween: Mock;
  deleteById: Mock;
};

describe('RelationService', () => {
  let service: RelationService;
  let mockRepository: MockRelationRepository;

  const mockRelation = {
    id: 'relation-1',
    apiKeyId: 'api-key-1',
    userId: 'user-1',
    sourceId: 'entity-1',
    targetId: 'entity-2',
    type: 'WORKS_AT',
    properties: { role: 'Engineer' },
    confidence: 0.9,
    validFrom: new Date('2020-01-01'),
    validTo: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockRelationWithEntities = {
    ...mockRelation,
    source: { id: 'entity-1', type: 'Person', name: 'John' },
    target: { id: 'entity-2', type: 'Company', name: 'Acme' },
  };

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findByType: vi.fn(),
      listWithEntities: vi.fn(),
      findByEntity: vi.fn(),
      findBetween: vi.fn(),
      deleteById: vi.fn(),
    };

    service = new RelationService(mockRepository as any);
  });

  describe('create', () => {
    it('should create relation with default confidence', async () => {
      mockRepository.create.mockResolvedValue(mockRelation);

      const result = await service.create('api-key-1', {
        userId: 'user-1',
        sourceId: 'entity-1',
        targetId: 'entity-2',
        type: 'WORKS_AT',
      });

      expect(mockRepository.create).toHaveBeenCalledWith('api-key-1', {
        userId: 'user-1',
        sourceId: 'entity-1',
        targetId: 'entity-2',
        type: 'WORKS_AT',
        properties: null,
        confidence: 1.0,
        validFrom: null,
        validTo: null,
      });
      expect(result).toEqual(mockRelation);
    });

    it('should create relation with custom properties and confidence', async () => {
      mockRepository.create.mockResolvedValue(mockRelation);

      await service.create('api-key-1', {
        userId: 'user-1',
        sourceId: 'entity-1',
        targetId: 'entity-2',
        type: 'WORKS_AT',
        properties: { role: 'Engineer' },
        confidence: 0.9,
      });

      expect(mockRepository.create).toHaveBeenCalledWith('api-key-1', {
        userId: 'user-1',
        sourceId: 'entity-1',
        targetId: 'entity-2',
        type: 'WORKS_AT',
        properties: { role: 'Engineer' },
        confidence: 0.9,
        validFrom: null,
        validTo: null,
      });
    });

    it('should create relation with validity dates', async () => {
      mockRepository.create.mockResolvedValue(mockRelation);

      await service.create('api-key-1', {
        userId: 'user-1',
        sourceId: 'entity-1',
        targetId: 'entity-2',
        type: 'WORKED_AT',
        validFrom: '2020-01-01',
        validTo: '2023-12-31',
      });

      expect(mockRepository.create).toHaveBeenCalledWith('api-key-1', {
        userId: 'user-1',
        sourceId: 'entity-1',
        targetId: 'entity-2',
        type: 'WORKED_AT',
        properties: null,
        confidence: 1.0,
        validFrom: new Date('2020-01-01'),
        validTo: new Date('2023-12-31'),
      });
    });
  });

  describe('createMany', () => {
    it('should create multiple relations', async () => {
      mockRepository.create
        .mockResolvedValueOnce({ ...mockRelation, id: 'relation-1' })
        .mockResolvedValueOnce({
          ...mockRelation,
          id: 'relation-2',
          type: 'KNOWS',
        });

      const dtos = [
        {
          userId: 'user-1',
          sourceId: 'entity-1',
          targetId: 'entity-2',
          type: 'WORKS_AT',
        },
        {
          userId: 'user-1',
          sourceId: 'entity-1',
          targetId: 'entity-3',
          type: 'KNOWS',
        },
      ];

      const result = await service.createMany('api-key-1', dtos);

      expect(mockRepository.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('WORKS_AT');
      expect(result[1].type).toBe('KNOWS');
    });

    it('should return empty array for empty input', async () => {
      const result = await service.createMany('api-key-1', []);

      expect(result).toEqual([]);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should list relations with entities (default)', async () => {
      mockRepository.listWithEntities.mockResolvedValue([
        mockRelationWithEntities,
      ]);

      const result = await service.list('api-key-1', 'user-1');

      expect(mockRepository.listWithEntities).toHaveBeenCalledWith(
        'api-key-1',
        'user-1',
        {
          limit: undefined,
          offset: undefined,
        },
      );
      expect(result).toEqual([mockRelationWithEntities]);
    });

    it('should filter by type when provided', async () => {
      mockRepository.findByType.mockResolvedValue([mockRelationWithEntities]);

      const result = await service.list('api-key-1', 'user-1', {
        type: 'WORKS_AT',
      });

      expect(mockRepository.findByType).toHaveBeenCalledWith(
        'api-key-1',
        'user-1',
        'WORKS_AT',
      );
      expect(mockRepository.listWithEntities).not.toHaveBeenCalled();
      expect(result).toEqual([mockRelationWithEntities]);
    });

    it('should apply pagination', async () => {
      mockRepository.listWithEntities.mockResolvedValue([
        mockRelationWithEntities,
      ]);

      await service.list('api-key-1', 'user-1', { limit: 20, offset: 10 });

      expect(mockRepository.listWithEntities).toHaveBeenCalledWith(
        'api-key-1',
        'user-1',
        {
          limit: 20,
          offset: 10,
        },
      );
    });
  });

  describe('getByEntity', () => {
    it('should return all relations for an entity', async () => {
      const relations = [
        mockRelationWithEntities,
        { ...mockRelationWithEntities, id: 'relation-2', type: 'KNOWS' },
      ];
      mockRepository.findByEntity.mockResolvedValue(relations);

      const result = await service.getByEntity('api-key-1', 'entity-1');

      expect(mockRepository.findByEntity).toHaveBeenCalledWith(
        'api-key-1',
        'entity-1',
      );
      expect(result).toEqual(relations);
    });

    it('should return empty array when entity has no relations', async () => {
      mockRepository.findByEntity.mockResolvedValue([]);

      const result = await service.getByEntity(
        'api-key-1',
        'entity-without-relations',
      );

      expect(result).toEqual([]);
    });
  });

  describe('getBetween', () => {
    it('should return relations between two entities', async () => {
      mockRepository.findBetween.mockResolvedValue([mockRelation]);

      const result = await service.getBetween(
        'api-key-1',
        'entity-1',
        'entity-2',
      );

      expect(mockRepository.findBetween).toHaveBeenCalledWith(
        'api-key-1',
        'entity-1',
        'entity-2',
      );
      expect(result).toEqual([mockRelation]);
    });

    it('should return multiple relations if they exist', async () => {
      const relations = [
        mockRelation,
        { ...mockRelation, id: 'relation-2', type: 'COLLABORATES_WITH' },
      ];
      mockRepository.findBetween.mockResolvedValue(relations);

      const result = await service.getBetween(
        'api-key-1',
        'entity-1',
        'entity-2',
      );

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no relations exist', async () => {
      mockRepository.findBetween.mockResolvedValue([]);

      const result = await service.getBetween(
        'api-key-1',
        'entity-1',
        'entity-3',
      );

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete relation by id', async () => {
      mockRepository.deleteById.mockResolvedValue(undefined);

      await service.delete('api-key-1', 'relation-1');

      expect(mockRepository.deleteById).toHaveBeenCalledWith(
        'api-key-1',
        'relation-1',
      );
    });
  });
});

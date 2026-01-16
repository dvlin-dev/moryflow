/**
 * GraphService 单元测试
 *
 * 测试知识图谱遍历服务的核心功能：
 * - 获取完整图谱
 * - 从指定节点遍历（BFS）
 * - 查找两节点间路径
 * - 获取邻居节点
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { GraphService } from '../graph.service';

// Mock 类型定义
type MockEntityRepository = {
  findMany: Mock;
  findById: Mock;
};

type MockRelationRepository = {
  findByUser: Mock;
  findByEntity: Mock;
};

describe('GraphService', () => {
  let service: GraphService;
  let mockEntityRepository: MockEntityRepository;
  let mockRelationRepository: MockRelationRepository;

  const mockEntity1 = {
    id: 'entity-1',
    apiKeyId: 'api-key-1',
    userId: 'user-1',
    type: 'Person',
    name: 'John',
    properties: { age: 30 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEntity2 = {
    id: 'entity-2',
    apiKeyId: 'api-key-1',
    userId: 'user-1',
    type: 'Company',
    name: 'Acme',
    properties: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEntity3 = {
    id: 'entity-3',
    apiKeyId: 'api-key-1',
    userId: 'user-1',
    type: 'Person',
    name: 'Jane',
    properties: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRelation1 = {
    id: 'relation-1',
    apiKeyId: 'api-key-1',
    userId: 'user-1',
    sourceId: 'entity-1',
    targetId: 'entity-2',
    type: 'WORKS_AT',
    properties: { role: 'Engineer' },
    confidence: 0.9,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRelation2 = {
    id: 'relation-2',
    apiKeyId: 'api-key-1',
    userId: 'user-1',
    sourceId: 'entity-1',
    targetId: 'entity-3',
    type: 'KNOWS',
    properties: null,
    confidence: 0.8,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockEntityRepository = {
      findMany: vi.fn(),
      findById: vi.fn(),
    };

    mockRelationRepository = {
      findByUser: vi.fn(),
      findByEntity: vi.fn(),
    };

    service = new GraphService(
      mockEntityRepository as any,
      mockRelationRepository as any,
    );
  });

  describe('getFullGraph', () => {
    it('should return full graph with nodes and edges', async () => {
      mockEntityRepository.findMany.mockResolvedValue([
        mockEntity1,
        mockEntity2,
      ]);
      mockRelationRepository.findByUser.mockResolvedValue([mockRelation1]);

      const result = await service.getFullGraph('api-key-1', 'user-1');

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.nodes[0]).toMatchObject({
        id: 'entity-1',
        type: 'Person',
        name: 'John',
      });
      expect(result.edges[0]).toMatchObject({
        id: 'relation-1',
        type: 'WORKS_AT',
        sourceId: 'entity-1',
        targetId: 'entity-2',
      });
    });

    it('should respect limit option', async () => {
      mockEntityRepository.findMany.mockResolvedValue([mockEntity1]);
      mockRelationRepository.findByUser.mockResolvedValue([]);

      await service.getFullGraph('api-key-1', 'user-1', { limit: 10 });

      expect(mockEntityRepository.findMany).toHaveBeenCalledWith('api-key-1', {
        where: { userId: 'user-1' },
        take: 10,
      });
      expect(mockRelationRepository.findByUser).toHaveBeenCalledWith(
        'api-key-1',
        'user-1',
        {
          limit: 10,
        },
      );
    });

    it('should use default limit of 1000', async () => {
      mockEntityRepository.findMany.mockResolvedValue([]);
      mockRelationRepository.findByUser.mockResolvedValue([]);

      await service.getFullGraph('api-key-1', 'user-1');

      expect(mockEntityRepository.findMany).toHaveBeenCalledWith('api-key-1', {
        where: { userId: 'user-1' },
        take: 1000,
      });
    });

    it('should return empty graph when no data', async () => {
      mockEntityRepository.findMany.mockResolvedValue([]);
      mockRelationRepository.findByUser.mockResolvedValue([]);

      const result = await service.getFullGraph('api-key-1', 'user-1');

      expect(result).toEqual({ nodes: [], edges: [] });
    });
  });

  describe('traverse', () => {
    it('should traverse from start node with BFS', async () => {
      mockEntityRepository.findById
        .mockResolvedValueOnce(mockEntity1)
        .mockResolvedValueOnce(mockEntity2);
      mockRelationRepository.findByEntity.mockResolvedValueOnce([
        mockRelation1,
      ]);

      const result = await service.traverse('api-key-1', 'entity-1', {
        maxDepth: 1,
      });

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
    });

    it('should respect maxDepth option', async () => {
      mockEntityRepository.findById.mockResolvedValueOnce(mockEntity1);
      mockRelationRepository.findByEntity.mockResolvedValueOnce([]);

      const result = await service.traverse('api-key-1', 'entity-1', {
        maxDepth: 0,
      });

      // maxDepth=0 意味着只获取起始节点，不遍历关系
      expect(result.nodes).toHaveLength(1);
      expect(result.edges).toHaveLength(0);
    });

    it('should filter by entity types', async () => {
      mockEntityRepository.findById
        .mockResolvedValueOnce(mockEntity1)
        .mockResolvedValueOnce(mockEntity2)
        .mockResolvedValueOnce(mockEntity3);
      mockRelationRepository.findByEntity
        .mockResolvedValueOnce([mockRelation1, mockRelation2])
        .mockResolvedValue([]); // 后续调用返回空

      const result = await service.traverse('api-key-1', 'entity-1', {
        entityTypes: ['Person'],
      });

      // 应该过滤掉非 Person 类型的实体
      const personNodes = result.nodes.filter((n) => n.type === 'Person');
      expect(personNodes.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by relation types', async () => {
      mockEntityRepository.findById
        .mockResolvedValueOnce(mockEntity1)
        .mockResolvedValueOnce(mockEntity2);
      mockRelationRepository.findByEntity
        .mockResolvedValueOnce([mockRelation1, mockRelation2])
        .mockResolvedValue([]); // 后续调用返回空

      const result = await service.traverse('api-key-1', 'entity-1', {
        relationTypes: ['WORKS_AT'],
      });

      // 只应该包含 WORKS_AT 类型的关系
      const worksAtEdges = result.edges.filter((e) => e.type === 'WORKS_AT');
      expect(worksAtEdges).toHaveLength(result.edges.length);
    });

    it('should respect limit option', async () => {
      mockEntityRepository.findById.mockResolvedValue(mockEntity1);
      mockRelationRepository.findByEntity.mockResolvedValue([]);

      const result = await service.traverse('api-key-1', 'entity-1', {
        limit: 1,
      });

      expect(result.nodes.length).toBeLessThanOrEqual(1);
    });

    it('should not revisit nodes', async () => {
      // 创建一个循环图：A -> B -> A
      const relationBack = {
        ...mockRelation1,
        id: 'relation-back',
        sourceId: 'entity-2',
        targetId: 'entity-1',
      };

      mockEntityRepository.findById
        .mockResolvedValueOnce(mockEntity1)
        .mockResolvedValueOnce(mockEntity2);
      mockRelationRepository.findByEntity
        .mockResolvedValueOnce([mockRelation1])
        .mockResolvedValueOnce([relationBack]);

      const result = await service.traverse('api-key-1', 'entity-1', {
        maxDepth: 3,
      });

      // 每个节点只应该出现一次
      const nodeIds = result.nodes.map((n) => n.id);
      const uniqueIds = [...new Set(nodeIds)];
      expect(nodeIds.length).toBe(uniqueIds.length);
    });

    it('should skip non-existent entities', async () => {
      mockEntityRepository.findById.mockResolvedValue(null);

      const result = await service.traverse('api-key-1', 'non-existent');

      expect(result.nodes).toHaveLength(0);
    });
  });

  describe('findPath', () => {
    it('should find path between two connected nodes', async () => {
      mockEntityRepository.findById
        .mockResolvedValueOnce(mockEntity2) // target
        .mockResolvedValueOnce(mockEntity1); // source
      mockRelationRepository.findByEntity.mockResolvedValueOnce([
        mockRelation1,
      ]);

      const result = await service.findPath(
        'api-key-1',
        'entity-1',
        'entity-2',
      );

      expect(result).not.toBeNull();
      expect(result!.nodes).toHaveLength(2);
      expect(result!.edges).toHaveLength(1);
    });

    it('should return null when no path exists', async () => {
      mockRelationRepository.findByEntity.mockResolvedValue([]);

      const result = await service.findPath(
        'api-key-1',
        'entity-1',
        'entity-99',
      );

      expect(result).toBeNull();
    });

    it('should find shortest path (BFS)', async () => {
      // A -> B -> C, A -> C（直接）
      const directRelation = {
        ...mockRelation1,
        id: 'direct',
        targetId: 'entity-3',
        type: 'DIRECT',
      };

      mockRelationRepository.findByEntity.mockResolvedValueOnce([
        directRelation,
      ]); // A 的关系，直接到 C

      mockEntityRepository.findById
        .mockResolvedValueOnce(mockEntity3) // C (target)
        .mockResolvedValueOnce(mockEntity1); // A (source)

      const result = await service.findPath(
        'api-key-1',
        'entity-1',
        'entity-3',
      );

      // BFS 应该找到直接路径
      expect(result).not.toBeNull();
      expect(result!.edges).toHaveLength(1);
    });

    it('should respect maxDepth', async () => {
      // 设置需要 3 步才能到达的路径，但限制 maxDepth=2
      mockRelationRepository.findByEntity.mockResolvedValue([]);

      const result = await service.findPath(
        'api-key-1',
        'entity-1',
        'entity-far',
        2,
      );

      expect(result).toBeNull();
    });

    it('should handle self-loop (source equals target)', async () => {
      mockEntityRepository.findById.mockResolvedValue(mockEntity1);

      const result = await service.findPath(
        'api-key-1',
        'entity-1',
        'entity-1',
      );

      // 源和目标相同，应该立即返回
      expect(result).not.toBeNull();
      expect(result!.nodes).toHaveLength(1);
      expect(result!.edges).toHaveLength(0);
    });
  });

  describe('getNeighbors', () => {
    it('should return all neighbors by default (both directions)', async () => {
      mockRelationRepository.findByEntity.mockResolvedValue([
        mockRelation1,
        mockRelation2,
      ]);
      mockEntityRepository.findById
        .mockResolvedValueOnce(mockEntity2)
        .mockResolvedValueOnce(mockEntity3);

      const result = await service.getNeighbors('api-key-1', 'entity-1');

      expect(result).toHaveLength(2);
      expect(result[0].entity.id).toBe('entity-2');
      expect(result[1].entity.id).toBe('entity-3');
    });

    it('should filter outgoing relations only', async () => {
      const incomingRelation = {
        ...mockRelation1,
        sourceId: 'entity-2',
        targetId: 'entity-1',
      };
      mockRelationRepository.findByEntity.mockResolvedValue([
        mockRelation1,
        incomingRelation,
      ]);
      mockEntityRepository.findById.mockResolvedValue(mockEntity2);

      const result = await service.getNeighbors('api-key-1', 'entity-1', {
        direction: 'out',
      });

      // 只应该返回 entity-1 作为 source 的关系
      expect(result).toHaveLength(1);
    });

    it('should filter incoming relations only', async () => {
      const incomingRelation = {
        ...mockRelation1,
        sourceId: 'entity-2',
        targetId: 'entity-1',
      };
      mockRelationRepository.findByEntity.mockResolvedValue([
        mockRelation1,
        incomingRelation,
      ]);
      mockEntityRepository.findById.mockResolvedValue(mockEntity2);

      const result = await service.getNeighbors('api-key-1', 'entity-1', {
        direction: 'in',
      });

      // 只应该返回 entity-1 作为 target 的关系
      expect(result).toHaveLength(1);
    });

    it('should filter by relation types', async () => {
      mockRelationRepository.findByEntity.mockResolvedValue([
        mockRelation1,
        mockRelation2,
      ]);
      mockEntityRepository.findById.mockResolvedValue(mockEntity2);

      const result = await service.getNeighbors('api-key-1', 'entity-1', {
        relationTypes: ['WORKS_AT'],
      });

      // 只应该返回 WORKS_AT 类型的关系
      expect(result).toHaveLength(1);
      expect(result[0].relation.type).toBe('WORKS_AT');
    });

    it('should skip non-existent neighbor entities', async () => {
      mockRelationRepository.findByEntity.mockResolvedValue([mockRelation1]);
      mockEntityRepository.findById.mockResolvedValue(null);

      const result = await service.getNeighbors('api-key-1', 'entity-1');

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no relations', async () => {
      mockRelationRepository.findByEntity.mockResolvedValue([]);

      const result = await service.getNeighbors('api-key-1', 'entity-isolated');

      expect(result).toEqual([]);
    });
  });

  describe('traverse edge deduplication', () => {
    it('should deduplicate edges when same edge appears multiple times', async () => {
      // 设置循环图：同一条边从两个方向返回
      mockEntityRepository.findById
        .mockResolvedValueOnce(mockEntity1)
        .mockResolvedValueOnce(mockEntity2)
        .mockResolvedValueOnce(mockEntity1);

      const bidirectionalRelation = {
        ...mockRelation1,
      };

      mockRelationRepository.findByEntity
        .mockResolvedValueOnce([bidirectionalRelation])
        .mockResolvedValueOnce([bidirectionalRelation]);

      const result = await service.traverse('api-key-1', 'entity-1', {
        maxDepth: 2,
      });

      // 边应该被去重
      const edgeIds = result.edges.map((e) => e.id);
      const uniqueEdgeIds = [...new Set(edgeIds)];
      expect(edgeIds.length).toBe(uniqueEdgeIds.length);
    });
  });
});

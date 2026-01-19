/**
 * MemoryService 单元测试
 *
 * 测试 Memory 模块的核心业务逻辑：
 * - 创建 Memory（含计费和向量生成）
 * - 语义搜索（含计费和向量生成）
 * - 列表查询
 * - 跨库查询（Console 用）
 * - 导出功能
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { MemoryService } from '../memory.service';

// Mock 类型定义
type MockMemoryRepository = {
  createWithEmbedding: Mock;
  searchSimilar: Mock;
  findMany: Mock;
  findById: Mock;
  deleteById: Mock;
  delete: Mock;
};

type MockPrismaService = {
  apiKey: {
    findMany: Mock;
  };
};

type MockVectorPrismaService = {
  memory: {
    findMany: Mock;
    count: Mock;
  };
};

type MockEmbeddingService = {
  generateEmbedding: Mock;
};

type MockBillingService = {
  deductOrThrow: Mock;
  refundOnFailure: Mock;
};

describe('MemoryService', () => {
  let service: MemoryService;
  let mockRepository: MockMemoryRepository;
  let mockPrisma: MockPrismaService;
  let mockVectorPrisma: MockVectorPrismaService;
  let mockEmbeddingService: MockEmbeddingService;
  let mockBillingService: MockBillingService;

  const mockMemory = {
    id: 'memory-1',
    apiKeyId: 'api-key-1',
    userId: 'user-1',
    agentId: null,
    sessionId: null,
    content: 'Test memory content',
    metadata: { key: 'value' },
    source: 'test',
    importance: 0.8,
    tags: ['tag1', 'tag2'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockEmbedding = {
    embedding: [0.1, 0.2, 0.3],
    model: 'text-embedding-3-small',
    dimensions: 3,
  };

  beforeEach(() => {
    mockRepository = {
      createWithEmbedding: vi.fn(),
      searchSimilar: vi.fn(),
      findMany: vi.fn(),
      findById: vi.fn(),
      deleteById: vi.fn(),
      delete: vi.fn(),
    };

    mockPrisma = {
      apiKey: {
        findMany: vi.fn(),
      },
    };

    mockVectorPrisma = {
      memory: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    mockEmbeddingService = {
      generateEmbedding: vi.fn(),
    };

    mockBillingService = {
      deductOrThrow: vi.fn(),
      refundOnFailure: vi.fn(),
    };

    service = new MemoryService(
      mockRepository as any,
      mockPrisma as any,
      mockVectorPrisma as any,
      mockEmbeddingService as any,
      mockBillingService as any,
    );
  });

  describe('create', () => {
    it('should create memory with billing deduction and embedding', async () => {
      mockBillingService.deductOrThrow.mockResolvedValue({
        deduct: {
          success: true,
          breakdown: [
            {
              source: 'DAILY',
              amount: 1,
              transactionId: 'tx_1',
              balanceBefore: 100,
              balanceAfter: 99,
            },
          ],
        },
        amount: 1,
      });
      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockRepository.createWithEmbedding.mockResolvedValue(mockMemory);

      const result = await service.create('platform-user-1', 'api-key-1', {
        userId: 'user-1',
        content: 'Test content',
        tags: ['tag1'],
      });

      expect(mockBillingService.deductOrThrow).toHaveBeenCalledWith({
        userId: 'platform-user-1',
        billingKey: 'memox.memory.create',
        referenceId: expect.any(String),
      });
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        'Test content',
      );
      expect(mockRepository.createWithEmbedding).toHaveBeenCalledWith(
        'api-key-1',
        expect.objectContaining({
          userId: 'user-1',
          content: 'Test content',
          tags: ['tag1'],
        }),
        mockEmbedding.embedding,
      );
      expect(result).toEqual(mockMemory);
    });

    it('should refund on embedding failure', async () => {
      mockBillingService.deductOrThrow.mockResolvedValue({
        deduct: {
          success: true,
          breakdown: [
            {
              source: 'DAILY',
              amount: 1,
              transactionId: 'tx_1',
              balanceBefore: 100,
              balanceAfter: 99,
            },
          ],
        },
        amount: 1,
      });
      mockEmbeddingService.generateEmbedding.mockRejectedValue(
        new Error('Embedding failed'),
      );

      await expect(
        service.create('platform-user-1', 'api-key-1', {
          userId: 'user-1',
          content: 'Test content',
        }),
      ).rejects.toThrow('Embedding failed');

      expect(mockBillingService.refundOnFailure).toHaveBeenCalledWith({
        userId: 'platform-user-1',
        billingKey: 'memox.memory.create',
        referenceId: expect.any(String),
        breakdown: expect.any(Array),
      });
    });

    it('should refund on repository failure', async () => {
      mockBillingService.deductOrThrow.mockResolvedValue({
        deduct: {
          success: true,
          breakdown: [
            {
              source: 'DAILY',
              amount: 1,
              transactionId: 'tx_1',
              balanceBefore: 100,
              balanceAfter: 99,
            },
          ],
        },
        amount: 1,
      });
      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockRepository.createWithEmbedding.mockRejectedValue(
        new Error('DB Error'),
      );

      await expect(
        service.create('platform-user-1', 'api-key-1', {
          userId: 'user-1',
          content: 'Test content',
        }),
      ).rejects.toThrow('DB Error');

      expect(mockBillingService.refundOnFailure).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should search memories with billing deduction', async () => {
      const mockSearchResults = [
        { ...mockMemory, similarity: 0.95 },
        { ...mockMemory, id: 'memory-2', similarity: 0.85 },
      ];

      mockBillingService.deductOrThrow.mockResolvedValue({
        deduct: {
          success: true,
          breakdown: [
            {
              source: 'DAILY',
              amount: 1,
              transactionId: 'tx_1',
              balanceBefore: 100,
              balanceAfter: 99,
            },
          ],
        },
        amount: 1,
      });
      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockRepository.searchSimilar.mockResolvedValue(mockSearchResults);

      const result = await service.search('platform-user-1', 'api-key-1', {
        userId: 'user-1',
        query: 'test query',
        limit: 10,
        threshold: 0.7,
      });

      expect(mockBillingService.deductOrThrow).toHaveBeenCalledWith({
        userId: 'platform-user-1',
        billingKey: 'memox.memory.search',
        referenceId: expect.any(String),
      });
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        'test query',
      );
      expect(mockRepository.searchSimilar).toHaveBeenCalledWith(
        'api-key-1',
        'user-1',
        mockEmbedding.embedding,
        10,
        0.7,
        undefined, // agentId
        undefined, // sessionId
      );
      expect(result).toEqual(mockSearchResults);
    });

    it('should refund on search failure', async () => {
      mockBillingService.deductOrThrow.mockResolvedValue({
        deduct: {
          success: true,
          breakdown: [
            {
              source: 'DAILY',
              amount: 1,
              transactionId: 'tx_1',
              balanceBefore: 100,
              balanceAfter: 99,
            },
          ],
        },
        amount: 1,
      });
      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockRepository.searchSimilar.mockRejectedValue(
        new Error('Search failed'),
      );

      await expect(
        service.search('platform-user-1', 'api-key-1', {
          userId: 'user-1',
          query: 'test query',
          limit: 10,
          threshold: 0.7,
        }),
      ).rejects.toThrow('Search failed');

      expect(mockBillingService.refundOnFailure).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should list memories with pagination', async () => {
      mockRepository.findMany.mockResolvedValue([mockMemory]);

      const result = await service.list('api-key-1', 'user-1', {
        limit: 20,
        offset: 0,
      });

      expect(mockRepository.findMany).toHaveBeenCalledWith('api-key-1', {
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
      expect(result).toEqual([mockMemory]);
    });

    it('should filter by agentId and sessionId', async () => {
      mockRepository.findMany.mockResolvedValue([mockMemory]);

      await service.list('api-key-1', 'user-1', {
        agentId: 'agent-1',
        sessionId: 'session-1',
      });

      expect(mockRepository.findMany).toHaveBeenCalledWith('api-key-1', {
        where: { userId: 'user-1', agentId: 'agent-1', sessionId: 'session-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });
  });

  describe('getById', () => {
    it('should return memory by id', async () => {
      mockRepository.findById.mockResolvedValue(mockMemory);

      const result = await service.getById('api-key-1', 'memory-1');

      expect(mockRepository.findById).toHaveBeenCalledWith(
        'api-key-1',
        'memory-1',
      );
      expect(result).toEqual(mockMemory);
    });

    it('should return null when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.getById('api-key-1', 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete memory by id', async () => {
      mockRepository.deleteById.mockResolvedValue(undefined);

      await service.delete('api-key-1', 'memory-1');

      expect(mockRepository.deleteById).toHaveBeenCalledWith(
        'api-key-1',
        'memory-1',
      );
    });
  });

  describe('deleteByUser', () => {
    it('should delete all memories for a user', async () => {
      mockRepository.delete.mockResolvedValue(undefined);

      await service.deleteByUser('api-key-1', 'user-1');

      expect(mockRepository.delete).toHaveBeenCalledWith('api-key-1', {
        userId: 'user-1',
      });
    });
  });

  describe('listByUser (cross-database query)', () => {
    const mockApiKeys = [
      { id: 'api-key-1', name: 'Key 1' },
      { id: 'api-key-2', name: 'Key 2' },
    ];

    const mockMemories = [
      { ...mockMemory, apiKeyId: 'api-key-1' },
      { ...mockMemory, id: 'memory-2', apiKeyId: 'api-key-2' },
    ];

    it('should return memories with apiKeyName from cross-database query', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue(mockApiKeys);
      mockVectorPrisma.memory.findMany.mockResolvedValue(mockMemories);
      mockVectorPrisma.memory.count.mockResolvedValue(2);

      const result = await service.listByUser('platform-user-1', {
        limit: 20,
        offset: 0,
      });

      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { userId: 'platform-user-1' },
        select: { id: true, name: true },
      });
      expect(mockVectorPrisma.memory.findMany).toHaveBeenCalledWith({
        where: { apiKeyId: { in: ['api-key-1', 'api-key-2'] } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
      expect(result.memories).toHaveLength(2);
      expect(result.memories[0].apiKeyName).toBe('Key 1');
      expect(result.memories[1].apiKeyName).toBe('Key 2');
      expect(result.total).toBe(2);
    });

    it('should return empty result when user has no api keys', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([]);

      const result = await service.listByUser('platform-user-1');

      expect(result).toEqual({ memories: [], total: 0 });
      expect(mockVectorPrisma.memory.findMany).not.toHaveBeenCalled();
    });

    it('should filter by specific apiKeyId', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([mockApiKeys[0]]);
      mockVectorPrisma.memory.findMany.mockResolvedValue([mockMemories[0]]);
      mockVectorPrisma.memory.count.mockResolvedValue(1);

      const result = await service.listByUser('platform-user-1', {
        apiKeyId: 'api-key-1',
      });

      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { id: 'api-key-1', userId: 'platform-user-1' },
        select: { id: true, name: true },
      });
      expect(result.memories).toHaveLength(1);
    });

    it('should handle unknown apiKeyId reference gracefully', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        { id: 'api-key-1', name: 'Key 1' },
      ]);
      mockVectorPrisma.memory.findMany.mockResolvedValue([
        { ...mockMemory, apiKeyId: 'unknown-key' },
      ]);
      mockVectorPrisma.memory.count.mockResolvedValue(1);

      const result = await service.listByUser('platform-user-1');

      expect(result.memories[0].apiKeyName).toBe('Unknown');
    });
  });

  describe('exportByUser', () => {
    const mockApiKeys = [{ id: 'api-key-1', name: 'Key 1' }];
    const mockMemories = [mockMemory];

    beforeEach(() => {
      mockPrisma.apiKey.findMany.mockResolvedValue(mockApiKeys);
      mockVectorPrisma.memory.findMany.mockResolvedValue(mockMemories);
    });

    it('should export memories as JSON', async () => {
      const result = await service.exportByUser('platform-user-1', {
        format: 'json',
      });

      expect(result.contentType).toBe('application/json');
      expect(result.filename).toMatch(
        /^memories-export-\d{4}-\d{2}-\d{2}\.json$/,
      );

      const data = JSON.parse(result.data);
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('memory-1');
      expect(data[0].apiKeyName).toBe('Key 1');
    });

    it('should export memories as CSV', async () => {
      const result = await service.exportByUser('platform-user-1', {
        format: 'csv',
      });

      expect(result.contentType).toBe('text/csv');
      expect(result.filename).toMatch(
        /^memories-export-\d{4}-\d{2}-\d{2}\.csv$/,
      );

      // 检查 CSV 头部
      expect(result.data).toContain(
        'id,userId,agentId,sessionId,content,source,importance,tags,apiKeyName,createdAt',
      );
    });

    it('should return empty JSON when user has no api keys', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([]);

      const result = await service.exportByUser('platform-user-1', {
        format: 'json',
      });

      expect(result.data).toBe('[]');
    });

    it('should return empty CSV with headers when user has no api keys', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([]);

      const result = await service.exportByUser('platform-user-1', {
        format: 'csv',
      });

      expect(result.data).toBe(
        'id,userId,agentId,sessionId,content,source,importance,tags,apiKeyName,createdAt',
      );
    });

    it('should escape CSV fields correctly', async () => {
      mockVectorPrisma.memory.findMany.mockResolvedValue([
        {
          ...mockMemory,
          content: 'Content with, comma',
          source: 'Source with "quotes"',
        },
      ]);

      const result = await service.exportByUser('platform-user-1', {
        format: 'csv',
      });

      // 带逗号的字段应该用引号包围
      expect(result.data).toContain('"Content with, comma"');
      // 带引号的字段应该转义
      expect(result.data).toContain('"Source with ""quotes"""');
    });
  });
});

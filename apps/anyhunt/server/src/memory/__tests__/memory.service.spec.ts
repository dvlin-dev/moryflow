/**
 * MemoryService 单元测试
 * 测试 Mem0 核心逻辑：创建、搜索、更新、反馈
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createHash } from 'crypto';
import { MemoryService } from '../memory.service';
import type { MemoryRepository } from '../memory.repository';
import type { VectorPrismaService } from '../../vector-prisma/vector-prisma.service';
import type { EmbeddingService } from '../../embedding/embedding.service';
import type { BillingService } from '../../billing/billing.service';
import type { R2Service } from '../../storage/r2.service';
import type { MemoryLlmService } from '../services/memory-llm.service';

const mockMemory = {
  id: 'memory-1',
  apiKeyId: 'api-key-1',
  userId: 'user-1',
  agentId: null,
  appId: null,
  runId: null,
  orgId: null,
  projectId: null,
  memory: 'User likes coffee',
  input: [{ role: 'user', content: 'I like coffee' }],
  metadata: { source: 'test' },
  categories: [],
  keywords: [],
  hash: 'hash',
  immutable: false,
  expirationDate: null,
  timestamp: null,
  entities: null,
  relations: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

describe('MemoryService', () => {
  let service: MemoryService;
  let mockRepository: {
    createWithEmbedding: Mock;
    searchSimilar: Mock;
    findById: Mock;
    updateWithEmbedding: Mock;
    deleteById: Mock;
  };
  let mockVectorPrisma: {
    memory: { findMany: Mock; deleteMany: Mock };
    memoryHistory: { create: Mock; createMany: Mock };
    memoryFeedback: { deleteMany: Mock; create: Mock };
    memoryExport: { create: Mock; update: Mock; findFirst: Mock };
  };
  let mockEmbeddingService: { generateEmbedding: Mock };
  let mockBillingService: { deductOrThrow: Mock; refundOnFailure: Mock };
  let mockR2Service: { uploadFile: Mock; downloadFile: Mock };
  let mockMemoryLlmService: {
    inferMemoriesFromMessages: Mock;
    extractTags: Mock;
    extractGraph: Mock;
  };
  const embeddingVector = Array.from({ length: 1536 }, () => 0.001);

  beforeEach(() => {
    mockRepository = {
      createWithEmbedding: vi.fn(),
      searchSimilar: vi.fn(),
      findById: vi.fn(),
      updateWithEmbedding: vi.fn(),
      deleteById: vi.fn(),
    };

    mockVectorPrisma = {
      memory: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      memoryHistory: {
        create: vi.fn(),
        createMany: vi.fn(),
      },
      memoryFeedback: {
        deleteMany: vi.fn(),
        create: vi.fn(),
      },
      memoryExport: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
      },
    };

    mockEmbeddingService = {
      generateEmbedding: vi.fn().mockResolvedValue({
        embedding: embeddingVector,
        model: 'test',
        dimensions: 1536,
      }),
    };

    mockBillingService = {
      deductOrThrow: vi.fn().mockResolvedValue({ deduct: { breakdown: [] } }),
      refundOnFailure: vi.fn(),
    };

    mockR2Service = {
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
    };

    mockMemoryLlmService = {
      inferMemoriesFromMessages: vi.fn().mockResolvedValue(['I like coffee']),
      extractTags: vi.fn().mockResolvedValue({
        categories: ['coffee'],
        keywords: ['coffee'],
      }),
      extractGraph: vi.fn().mockResolvedValue(null),
    };

    service = new MemoryService(
      mockRepository as unknown as MemoryRepository,
      mockVectorPrisma as unknown as VectorPrismaService,
      mockEmbeddingService as unknown as EmbeddingService,
      mockBillingService as unknown as BillingService,
      mockR2Service as unknown as R2Service,
      mockMemoryLlmService as unknown as MemoryLlmService,
    );
  });

  it('should create memory and return events', async () => {
    mockRepository.createWithEmbedding.mockResolvedValue(mockMemory);

    const result = await service.create('user-platform', 'api-key-1', {
      messages: [{ role: 'user', content: 'I like coffee' }],
      user_id: 'user-1',
      infer: false,
      output_format: 'v1.1',
      async_mode: false,
      immutable: false,
      enable_graph: false,
    });

    expect(mockBillingService.deductOrThrow).toHaveBeenCalled();
    expect(mockRepository.createWithEmbedding).toHaveBeenCalledWith(
      'api-key-1',
      expect.objectContaining({
        memory: 'I like coffee',
        categories: ['coffee'],
        keywords: ['coffee'],
      }),
      embeddingVector,
    );
    expect(result).toEqual({
      results: [
        {
          id: 'memory-1',
          data: { memory: 'User likes coffee' },
          event: 'ADD',
        },
      ],
    });
  });

  it('should search memories using embeddings', async () => {
    mockRepository.searchSimilar.mockResolvedValue([mockMemory]);

    const result = await service.search('user-platform', 'api-key-1', {
      query: 'coffee',
      user_id: 'user-1',
      top_k: 5,
      rerank: false,
      keyword_search: false,
      filter_memories: false,
      only_metadata_based_search: false,
      output_format: 'v1.0',
    });

    expect(mockRepository.searchSimilar).toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({
        id: 'memory-1',
        memory: 'User likes coffee',
      }),
    ]);
  });

  it('should rerank memories when rerank is true', async () => {
    const memoryA = {
      ...mockMemory,
      id: 'memory-a',
      memory: 'User likes coffee',
      similarity: 0.2,
    };
    const memoryB = {
      ...mockMemory,
      id: 'memory-b',
      memory: 'User likes tea',
      similarity: 0.4,
    };
    mockRepository.searchSimilar.mockResolvedValue([memoryB, memoryA]);

    const result = await service.search('user-platform', 'api-key-1', {
      query: 'coffee',
      user_id: 'user-1',
      top_k: 5,
      rerank: true,
      keyword_search: false,
      filter_memories: false,
      only_metadata_based_search: false,
      output_format: 'v1.0',
    });

    expect(Array.isArray(result)).toBe(true);
    expect((result as { id: string }[])[0]?.id).toBe('memory-a');
  });

  it('should pass filters DSL to repository', async () => {
    mockRepository.searchSimilar.mockResolvedValue([mockMemory]);

    await service.search('user-platform', 'api-key-1', {
      query: 'coffee',
      filters: { AND: [{ user_id: 'user-1' }] },
      top_k: 10,
      rerank: false,
      keyword_search: false,
      filter_memories: false,
      only_metadata_based_search: false,
      output_format: 'v1.0',
    });

    expect(mockRepository.searchSimilar).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          filters: { AND: [{ user_id: 'user-1' }] },
        }),
      }),
    );
  });

  it('should update memory and create history', async () => {
    mockRepository.findById.mockResolvedValue(mockMemory);
    mockRepository.updateWithEmbedding.mockResolvedValue({
      ...mockMemory,
      memory: 'Updated memory',
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    });
    const hash = createHash('sha256').update('Updated memory').digest('hex');

    const result = await service.update('api-key-1', 'memory-1', {
      text: 'Updated memory',
    });

    expect(mockRepository.updateWithEmbedding).toHaveBeenCalledWith(
      'api-key-1',
      'memory-1',
      expect.objectContaining({
        memory: 'Updated memory',
        categories: ['coffee'],
        keywords: ['coffee'],
        hash,
      }),
      embeddingVector,
    );
    expect(mockVectorPrisma.memoryHistory.create).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        id: 'memory-1',
        text: 'Updated memory',
      }),
    );
  });

  it('should submit feedback', async () => {
    mockRepository.findById.mockResolvedValue(mockMemory);
    mockVectorPrisma.memoryFeedback.create.mockResolvedValue({
      id: 'feedback-1',
      feedback: 'POSITIVE',
      feedbackReason: 'relevant',
    });

    const result = await service.feedback('api-key-1', {
      memory_id: 'memory-1',
      feedback: 'POSITIVE',
      feedback_reason: 'relevant',
    });

    expect(result).toEqual({
      id: 'feedback-1',
      feedback: 'POSITIVE',
      feedback_reason: 'relevant',
    });
  });

  it('should reject feedback for missing memory', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(
      service.feedback('api-key-1', {
        memory_id: 'missing-memory',
        feedback: 'NEGATIVE',
      }),
    ).rejects.toThrow('Memory not found');
  });
});

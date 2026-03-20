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
import type { GraphScopeService } from '../../graph/graph-scope.service';
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
  originKind: 'MANUAL',
  sourceId: null,
  sourceRevisionId: null,
  derivedKey: null,
  content: 'User likes coffee',
  input: [{ role: 'user', content: 'I like coffee' }],
  metadata: { source: 'test' },
  categories: [],
  keywords: [],
  hash: 'hash',
  immutable: false,
  graphScopeId: null,
  graphProjectionState: 'DISABLED',
  graphProjectionErrorCode: null,
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
    listByFilters: Mock;
    findById: Mock;
    updateWithEmbedding: Mock;
    deleteById: Mock;
  };
  let mockVectorPrisma: {
    $transaction: Mock;
    memoryFact: { findMany: Mock; deleteMany: Mock };
    memoryFactHistory: { create: Mock; createMany: Mock };
    memoryFactFeedback: { deleteMany: Mock; create: Mock };
    memoryFactExport: {
      create: Mock;
      update: Mock;
      updateMany: Mock;
      findFirst: Mock;
    };
  };
  let mockEmbeddingService: { generateEmbedding: Mock };
  let mockBillingService: { deductOrThrow: Mock; refundOnFailure: Mock };
  let mockR2Service: {
    uploadFile: Mock;
    uploadStream: Mock;
    downloadFile: Mock;
  };
  let mockExportQueue: { add: Mock };
  let mockGraphProjectionQueue: { add: Mock };
  let mockGraphScopeService: { ensureScope: Mock; markProjectionQueued: Mock };
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
      listByFilters: vi.fn(),
      findById: vi.fn(),
      updateWithEmbedding: vi.fn(),
      deleteById: vi.fn(),
    };

    const transactionRunner = vi.fn(
      async (callback: (tx: unknown) => unknown) =>
        callback(mockVectorPrisma as unknown),
    );

    mockVectorPrisma = {
      $transaction: transactionRunner as unknown as Mock,
      memoryFact: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      memoryFactHistory: {
        create: vi.fn(),
        createMany: vi.fn(),
      },
      memoryFactFeedback: {
        deleteMany: vi.fn(),
        create: vi.fn(),
      },
      memoryFactExport: {
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
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
      uploadStream: vi.fn(),
      downloadFile: vi.fn(),
    };

    mockExportQueue = {
      add: vi.fn(),
    };

    mockGraphProjectionQueue = {
      add: vi.fn(),
    };

    mockGraphScopeService = {
      ensureScope: vi.fn(),
      markProjectionQueued: vi.fn(),
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
      mockGraphScopeService as unknown as GraphScopeService,
      mockExportQueue as any,
      mockGraphProjectionQueue as any,
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
      include_in_graph: false,
    });

    expect(mockBillingService.deductOrThrow).toHaveBeenCalled();
    expect(mockRepository.createWithEmbedding).toHaveBeenCalledWith(
      'api-key-1',
      expect.objectContaining({
        content: 'I like coffee',
        originKind: 'MANUAL',
        categories: ['coffee'],
        keywords: ['coffee'],
      }),
      embeddingVector,
      expect.anything(),
    );
    expect(result).toEqual({
      results: [
        {
          id: 'memory-1',
          data: { content: 'User likes coffee' },
          event: 'ADD',
        },
      ],
    });
  });

  it('should expose content and provenance in getById response', async () => {
    mockRepository.findById.mockResolvedValue({
      ...mockMemory,
      originKind: 'SOURCE_DERIVED',
      sourceId: 'source-1',
      sourceRevisionId: 'revision-1',
      derivedKey: 'fact:key:1',
      immutable: true,
      content: 'Derived fact content',
    });

    const result = await service.getById('api-key-1', 'memory-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'memory-1',
        content: 'Derived fact content',
        origin_kind: 'SOURCE_DERIVED',
        source_id: 'source-1',
        source_revision_id: 'revision-1',
        derived_key: 'fact:key:1',
        immutable: true,
      }),
    );
    expect(result).not.toHaveProperty('memory');
  });

  it('should search memories using embeddings', async () => {
    mockRepository.searchSimilar.mockResolvedValue([
      {
        ...mockMemory,
        entities: [{ name: 'Alice', type: 'person' }],
        relations: [{ source: 'Alice', target: 'Memox', relation: 'works_on' }],
      },
    ]);

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
        content: 'User likes coffee',
      }),
    ]);
    expect((result as Array<Record<string, unknown>>)[0]).not.toHaveProperty(
      'entities',
    );
    expect((result as Array<Record<string, unknown>>)[0]).not.toHaveProperty(
      'relations',
    );
  });

  it('should rerank memories when rerank is true', async () => {
    const memoryA = {
      ...mockMemory,
      id: 'memory-a',
      content: 'User likes coffee',
      similarity: 0.2,
    };
    const memoryB = {
      ...mockMemory,
      id: 'memory-b',
      content: 'User likes tea',
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
      content: 'Updated memory',
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
        content: 'Updated memory',
        categories: ['coffee'],
        keywords: ['coffee'],
        hash,
      }),
      embeddingVector,
      expect.anything(),
    );
    expect(mockVectorPrisma.memoryFactHistory.create).toHaveBeenCalled();
    expect(mockGraphProjectionQueue.add).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        id: 'memory-1',
        content: 'Updated memory',
      }),
    );
  });

  it('should disable graph by clearing scope and enqueue scoped cleanup', async () => {
    mockRepository.findById.mockResolvedValue({
      ...mockMemory,
      graphScopeId: 'graph-scope-old',
      graphProjectionState: 'READY',
    });
    mockRepository.updateWithEmbedding.mockResolvedValue({
      ...mockMemory,
      content: 'Updated memory',
      hash: createHash('sha256').update('Updated memory').digest('hex'),
      graphScopeId: null,
      graphProjectionState: 'DISABLED',
      graphProjectionErrorCode: null,
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    });

    await service.update('api-key-1', 'memory-1', {
      text: 'Updated memory',
      include_in_graph: false,
    });

    expect(mockRepository.updateWithEmbedding).toHaveBeenCalledWith(
      'api-key-1',
      'memory-1',
      expect.objectContaining({
        graphScopeId: null,
        graphProjectionState: 'DISABLED',
        graphProjectionErrorCode: null,
      }),
      embeddingVector,
      expect.anything(),
    );
    expect(mockGraphScopeService.markProjectionQueued).toHaveBeenCalledWith(
      'graph-scope-old',
    );
    expect(mockGraphProjectionQueue.add).toHaveBeenCalledWith(
      'cleanup-memory-fact',
      {
        kind: 'cleanup_memory_fact',
        apiKeyId: 'api-key-1',
        memoryId: 'memory-1',
        graphScopeId: 'graph-scope-old',
        memoryUpdatedAt: '2024-01-02T00:00:00.000Z',
      },
      expect.objectContaining({
        jobId:
          'memox-graph-cleanup-memory-api-key-1-graph-scope-old-memory-1-2024-01-02T00-00-00-000Z',
      }),
    );
  });

  it('should enqueue versioned graph projection jobs for graph-enabled updates', async () => {
    const updatedHash = createHash('sha256')
      .update('Updated memory in graph')
      .digest('hex');
    mockRepository.findById.mockResolvedValue({
      ...mockMemory,
      graphScopeId: 'graph-scope-1',
      graphProjectionState: 'READY',
    });
    mockRepository.updateWithEmbedding.mockResolvedValue({
      ...mockMemory,
      content: 'Updated memory in graph',
      hash: updatedHash,
      graphScopeId: 'graph-scope-1',
      graphProjectionState: 'PENDING',
      graphProjectionErrorCode: null,
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    });

    await service.update('api-key-1', 'memory-1', {
      text: 'Updated memory in graph',
      include_in_graph: true,
    });

    expect(mockGraphProjectionQueue.add).toHaveBeenCalledWith(
      'project-memory-fact',
      {
        kind: 'project_memory_fact',
        apiKeyId: 'api-key-1',
        memoryId: 'memory-1',
        graphScopeId: 'graph-scope-1',
        memoryHash: updatedHash,
        memoryUpdatedAt: '2024-01-02T00:00:00.000Z',
      },
      expect.objectContaining({
        jobId: `memox-graph-memory-api-key-1-memory-1-graph-scope-1-2024-01-02T00-00-00-000Z-${updatedHash}`,
      }),
    );
  });

  it('should reject update for source-derived memories even when immutable flag drifts', async () => {
    mockRepository.findById.mockResolvedValue({
      ...mockMemory,
      originKind: 'SOURCE_DERIVED',
      immutable: false,
    });

    await expect(
      service.update('api-key-1', 'memory-1', {
        text: 'Should be rejected',
      }),
    ).rejects.toThrow('Memory is immutable');
  });

  it('should reject deleteByFilter for source-derived memories even when immutable flag drifts', async () => {
    mockRepository.listByFilters.mockResolvedValue([
      {
        ...mockMemory,
        originKind: 'SOURCE_DERIVED',
        immutable: false,
      },
    ]);

    await expect(
      service.deleteByFilter('api-key-1', {
        user_id: 'user-1',
      }),
    ).rejects.toThrow('Memory is immutable');

    expect(
      mockVectorPrisma.memoryFactHistory.createMany,
    ).not.toHaveBeenCalled();
    expect(mockVectorPrisma.memoryFact.deleteMany).not.toHaveBeenCalled();
  });

  it('should submit feedback', async () => {
    mockRepository.findById.mockResolvedValue(mockMemory);
    mockVectorPrisma.memoryFactFeedback.create.mockResolvedValue({
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

  it('should create export job in queue', async () => {
    mockVectorPrisma.memoryFactExport.create.mockResolvedValue({
      id: 'export-1',
    });
    mockExportQueue.add.mockResolvedValue({ id: 'export-1' });

    const result = await service.createExport('api-key-1', {
      filters: { user_id: 'user-1' },
      org_id: 'org-1',
      project_id: 'project-1',
    });

    expect(mockExportQueue.add).toHaveBeenCalledWith(
      'memox-export:export-1',
      {
        memoryExportId: 'export-1',
        apiKeyId: 'api-key-1',
        filters: { user_id: 'user-1' },
        orgId: 'org-1',
        projectId: 'project-1',
      },
      expect.objectContaining({
        jobId: 'export-1',
        attempts: 2,
      }),
    );
    expect(result).toEqual({
      memory_export_id: 'export-1',
    });
  });

  it('should reject export payloads that drift from the public response schema', async () => {
    mockVectorPrisma.memoryFactExport.findFirst.mockResolvedValue({
      id: 'export-1',
      r2Key: 'export-1',
    });
    mockR2Service.downloadFile.mockResolvedValue(
      Buffer.from(JSON.stringify({ data: [] }), 'utf-8'),
    );

    await expect(
      service.getExport('api-key-1', {
        memory_export_id: 'export-1',
      }),
    ).rejects.toThrow();
  });

  it('should process export job and upload stream', async () => {
    mockRepository.listByFilters
      .mockResolvedValueOnce([mockMemory])
      .mockResolvedValueOnce([]);
    mockR2Service.uploadStream.mockResolvedValue(undefined);
    mockVectorPrisma.memoryFactExport.updateMany.mockResolvedValue({
      count: 1,
    });
    mockVectorPrisma.memoryFactExport.update.mockResolvedValue({
      id: 'export-1',
      status: 'COMPLETED',
    });

    await service.processExportJob({
      memoryExportId: 'export-1',
      apiKeyId: 'api-key-1',
      filters: { user_id: 'user-1' },
      orgId: 'org-1',
      projectId: 'project-1',
    });

    expect(mockVectorPrisma.memoryFactExport.updateMany).toHaveBeenCalledWith({
      where: { id: 'export-1', apiKeyId: 'api-key-1' },
      data: { status: 'PROCESSING', error: null },
    });
    expect(mockR2Service.uploadStream).toHaveBeenCalledWith(
      'api-key-1',
      'memox-exports',
      'export-1',
      expect.anything(),
      'application/json',
      undefined,
      { filename: 'memox-export-export-1.json' },
    );
    expect(mockVectorPrisma.memoryFactExport.update).toHaveBeenCalledWith({
      where: { id: 'export-1' },
      data: {
        status: 'COMPLETED',
        r2Key: 'export-1',
        error: null,
      },
    });
  });

  it('should reject batch update for expired memories', async () => {
    mockVectorPrisma.memoryFact.findMany.mockResolvedValue([
      {
        id: 'memory-1',
        content: 'expired memory',
        userId: 'user-1',
        agentId: null,
        appId: null,
        runId: null,
        input: [],
        metadata: null,
        categories: [],
        keywords: [],
        hash: 'hash',
        immutable: false,
        expirationDate: new Date(Date.now() - 1000),
      },
    ]);
    mockRepository.updateWithEmbedding.mockResolvedValue({
      ...mockMemory,
      id: 'memory-1',
      content: 'updated memory',
    });

    await expect(
      service.batchUpdate('api-key-1', {
        memories: [{ memory_id: 'memory-1', text: 'updated memory' }],
      }),
    ).rejects.toThrow('Memory not found');
  });

  it('should reject batch delete for expired memories', async () => {
    mockVectorPrisma.memoryFact.findMany.mockResolvedValue([
      {
        id: 'memory-1',
        content: 'expired memory',
        userId: 'user-1',
        agentId: null,
        appId: null,
        runId: null,
        immutable: false,
        expirationDate: new Date(Date.now() - 1000),
      },
    ]);

    await expect(
      service.batchDelete('api-key-1', {
        memory_ids: ['memory-1'],
      }),
    ).rejects.toThrow('Memory not found');
  });
});

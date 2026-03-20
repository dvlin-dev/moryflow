import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { Queue } from 'bullmq';
import type { MemoryRepository } from '../memory.repository';
import type { EmbeddingService } from '../../embedding';
import type { SourceStorageService } from '../../sources/source-storage.service';
import type { VectorPrismaService } from '../../vector-prisma';
import type { MemoryLlmService } from '../services/memory-llm.service';
import { SourceMemoryProjectionService } from '../source-memory-projection.service';
import type { GraphScopeService } from '../../graph/graph-scope.service';

describe('SourceMemoryProjectionService', () => {
  const buildDerivedKey = (content: string) =>
    `source_fact:${createHash('sha256').update(content).digest('hex')}`;
  const buildHash = (content: string) =>
    createHash('sha256').update(content).digest('hex');

  let service: SourceMemoryProjectionService;
  let memoryRepository: {
    createWithEmbedding: Mock;
    updateWithEmbedding: Mock;
  };
  let vectorPrisma: {
    knowledgeSource: { findFirst: Mock };
    knowledgeSourceRevision: { findFirst: Mock };
    memoryFact: { findMany: Mock };
    $transaction: Mock;
  };
  let memoryLlmService: {
    extractFactsFromText: Mock;
    extractTags: Mock;
  };
  let embeddingService: { generateBatchEmbeddings: Mock };
  let sourceStorageService: { downloadText: Mock };
  let graphScopeService: { ensureScope: Mock; markProjectionQueued: Mock };
  let graphProjectionQueue: { add: Mock };
  let txMock: {
    memoryFactFeedback: { deleteMany: Mock };
    memoryFact: { deleteMany: Mock };
  };

  beforeEach(() => {
    memoryRepository = {
      createWithEmbedding: vi.fn(),
      updateWithEmbedding: vi.fn(),
    };

    txMock = {
      memoryFactFeedback: {
        deleteMany: vi.fn(),
      },
      memoryFact: {
        deleteMany: vi.fn(),
      },
    };

    vectorPrisma = {
      knowledgeSource: {
        findFirst: vi.fn(),
      },
      knowledgeSourceRevision: {
        findFirst: vi.fn(),
      },
      memoryFact: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
        callback(txMock),
      ),
    };

    memoryLlmService = {
      extractFactsFromText: vi.fn(),
      extractTags: vi.fn(),
    };

    embeddingService = {
      generateBatchEmbeddings: vi.fn(),
    };

    sourceStorageService = {
      downloadText: vi.fn(),
    };

    graphScopeService = {
      ensureScope: vi.fn().mockResolvedValue({
        id: 'graph-scope-1',
        apiKeyId: 'api-key-1',
        projectId: 'project-1',
      }),
      markProjectionQueued: vi.fn().mockResolvedValue(undefined),
    };

    graphProjectionQueue = {
      add: vi.fn(),
    };

    service = new SourceMemoryProjectionService(
      vectorPrisma as unknown as VectorPrismaService,
      memoryRepository as unknown as MemoryRepository,
      memoryLlmService as unknown as MemoryLlmService,
      embeddingService as unknown as EmbeddingService,
      sourceStorageService as unknown as SourceStorageService,
      graphScopeService as unknown as GraphScopeService,
      graphProjectionQueue as unknown as Queue,
    );
  });

  it('projects derived facts with idempotent upsert and stale cleanup', async () => {
    vectorPrisma.knowledgeSource.findFirst.mockResolvedValue({
      id: 'source-1',
      apiKeyId: 'api-key-1',
      userId: 'user-1',
      agentId: null,
      appId: 'app-1',
      runId: null,
      orgId: null,
      projectId: 'project-1',
      title: 'Doc',
      displayPath: '/docs/doc.md',
      metadata: {
        workspaceId: 'ws-1',
        vaultId: 'vault-1',
      },
      status: 'ACTIVE',
      currentRevisionId: 'revision-1',
    });
    vectorPrisma.knowledgeSourceRevision.findFirst.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    sourceStorageService.downloadText.mockResolvedValue(
      '# Doc\n\nAlice works on Memox.',
    );
    memoryLlmService.extractFactsFromText.mockResolvedValue([
      'Alice works on Memox.',
      ' Alice works on Memox. ',
      'Memox belongs to Anyhunt.',
    ]);
    memoryLlmService.extractTags
      .mockResolvedValueOnce({
        categories: ['people'],
        keywords: ['alice', 'memox'],
      })
      .mockResolvedValueOnce({
        categories: ['company'],
        keywords: ['memox', 'anyhunt'],
      });
    embeddingService.generateBatchEmbeddings.mockResolvedValue([
      { embedding: [0.1, 0.2], model: 'mock', dimensions: 2 },
      { embedding: [0.3, 0.4], model: 'mock', dimensions: 2 },
    ]);
    vectorPrisma.memoryFact.findMany.mockResolvedValue([
      {
        id: 'memory-existing',
        derivedKey: buildDerivedKey('Alice works on Memox.'),
        graphScopeId: 'graph-scope-1',
        updatedAt: new Date('2026-03-20T10:00:00.000Z'),
      },
      {
        id: 'memory-stale',
        derivedKey: 'source_fact:stale',
        graphScopeId: 'graph-scope-1',
        updatedAt: new Date('2026-03-20T09:00:00.000Z'),
      },
    ]);
    memoryRepository.updateWithEmbedding.mockResolvedValue({
      id: 'memory-existing',
      hash: buildHash('Alice works on Memox.'),
      graphScopeId: 'graph-scope-1',
      updatedAt: new Date('2026-03-20T10:05:00.000Z'),
    });
    memoryRepository.createWithEmbedding.mockResolvedValue({
      id: 'memory-created',
      hash: buildHash('Memox belongs to Anyhunt.'),
      graphScopeId: 'graph-scope-1',
      updatedAt: new Date('2026-03-20T10:06:00.000Z'),
    });

    const result = await service.processJob({
      apiKeyId: 'api-key-1',
      sourceId: 'source-1',
      revisionId: 'revision-1',
    });

    expect(memoryRepository.updateWithEmbedding).toHaveBeenCalledWith(
      'api-key-1',
      'memory-existing',
      expect.objectContaining({
        content: 'Alice works on Memox.',
        originKind: 'SOURCE_DERIVED',
        sourceId: 'source-1',
        sourceRevisionId: 'revision-1',
        metadata: {
          workspaceId: 'ws-1',
          vaultId: 'vault-1',
          source_title: 'Doc',
          source_display_path: '/docs/doc.md',
          projection_kind: 'source_memory_fact',
        },
        graphScopeId: 'graph-scope-1',
        graphProjectionState: 'PENDING',
      }),
      [0.1, 0.2],
      txMock,
    );
    expect(memoryRepository.createWithEmbedding).toHaveBeenCalledWith(
      'api-key-1',
      expect.objectContaining({
        content: 'Memox belongs to Anyhunt.',
        originKind: 'SOURCE_DERIVED',
        sourceId: 'source-1',
        sourceRevisionId: 'revision-1',
        metadata: {
          workspaceId: 'ws-1',
          vaultId: 'vault-1',
          source_title: 'Doc',
          source_display_path: '/docs/doc.md',
          projection_kind: 'source_memory_fact',
        },
        graphScopeId: 'graph-scope-1',
        graphProjectionState: 'PENDING',
      }),
      [0.3, 0.4],
      txMock,
    );
    expect(txMock.memoryFactFeedback.deleteMany).toHaveBeenCalledWith({
      where: { apiKeyId: 'api-key-1', memoryId: { in: ['memory-stale'] } },
    });
    expect(txMock.memoryFact.deleteMany).toHaveBeenCalledWith({
      where: { apiKeyId: 'api-key-1', id: { in: ['memory-stale'] } },
    });
    expect(graphProjectionQueue.add).toHaveBeenCalledWith(
      'project-memory-fact',
      {
        kind: 'project_memory_fact',
        apiKeyId: 'api-key-1',
        memoryId: 'memory-existing',
        graphScopeId: 'graph-scope-1',
        memoryHash: buildHash('Alice works on Memox.'),
        memoryUpdatedAt: '2026-03-20T10:05:00.000Z',
      },
      expect.objectContaining({
        jobId: `memox-graph-memory-api-key-1-memory-existing-graph-scope-1-2026-03-20T10-05-00-000Z-${buildHash('Alice works on Memox.')}`,
      }),
    );
    expect(graphProjectionQueue.add).toHaveBeenCalledWith(
      'cleanup-memory-fact',
      {
        kind: 'cleanup_memory_fact',
        apiKeyId: 'api-key-1',
        memoryId: 'memory-stale',
        graphScopeId: 'graph-scope-1',
        memoryUpdatedAt: '2026-03-20T09:00:00.000Z',
      },
      expect.objectContaining({
        jobId:
          'memox-graph-cleanup-memory-api-key-1-graph-scope-1-memory-stale-2026-03-20T09-00-00-000Z',
      }),
    );
    expect(result).toEqual({
      status: 'PROJECTED',
      sourceId: 'source-1',
      revisionId: 'revision-1',
      upsertedCount: 2,
      deletedCount: 1,
    });
    expect(graphScopeService.ensureScope).toHaveBeenCalledWith(
      'api-key-1',
      'project-1',
    );
    expect(graphScopeService.markProjectionQueued).toHaveBeenCalledWith(
      'graph-scope-1',
    );
  });

  it('skips projection when source is no longer active on the requested revision', async () => {
    vectorPrisma.knowledgeSource.findFirst.mockResolvedValue(null);

    const result = await service.processJob({
      apiKeyId: 'api-key-1',
      sourceId: 'source-1',
      revisionId: 'revision-1',
    });

    expect(sourceStorageService.downloadText).not.toHaveBeenCalled();
    expect(memoryRepository.createWithEmbedding).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'SKIPPED',
      sourceId: 'source-1',
      revisionId: 'revision-1',
      upsertedCount: 0,
      deletedCount: 0,
    });
  });

  it('skips projection when revision has no normalized text', async () => {
    vectorPrisma.knowledgeSource.findFirst.mockResolvedValue({
      id: 'source-1',
      apiKeyId: 'api-key-1',
      status: 'ACTIVE',
      currentRevisionId: 'revision-1',
    });
    vectorPrisma.knowledgeSourceRevision.findFirst.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      normalizedTextR2Key: null,
    });

    const result = await service.processJob({
      apiKeyId: 'api-key-1',
      sourceId: 'source-1',
      revisionId: 'revision-1',
    });

    expect(memoryLlmService.extractFactsFromText).not.toHaveBeenCalled();
    expect(result.status).toBe('SKIPPED');
  });
});

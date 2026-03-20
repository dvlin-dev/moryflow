import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GraphProjectionService } from '../graph-projection.service';
import type { VectorPrismaService } from '../../vector-prisma';
import type { MemoryRepository } from '../../memory';
import type { MemoryLlmService } from '../../memory';
import type { GraphScopeService } from '../graph-scope.service';

describe('GraphProjectionService', () => {
  let vectorPrisma: any;
  let memoryRepository: any;
  let memoryLlmService: any;
  let graphScopeService: any;
  let service: GraphProjectionService;
  let tx: any;

  beforeEach(() => {
    tx = {
      graphEntity: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: `${data.entityType}:${data.canonicalName}`,
          ...data,
        })),
        update: vi.fn(),
      },
      graphObservation: {
        create: vi.fn().mockResolvedValue(undefined),
      },
      graphRelation: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: `${data.fromEntityId}:${data.toEntityId}:${data.relationType}`,
          ...data,
        })),
        update: vi.fn(),
      },
    };

    vectorPrisma = {
      $transaction: vi.fn(async (callback) => callback(tx)),
      $executeRaw: vi.fn().mockResolvedValue(undefined),
      memoryFact: {
        update: vi.fn().mockResolvedValue(undefined),
      },
      graphObservation: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as VectorPrismaService;

    memoryRepository = {
      findById: vi.fn().mockResolvedValue({
        id: 'memory-1',
        content: 'Alice works on Memox',
        hash: 'hash-1',
        graphScopeId: 'graph-scope-1',
        sourceId: 'source-1',
        sourceRevisionId: 'revision-1',
        updatedAt: new Date('2026-03-20T10:00:00.000Z'),
      }),
    } as unknown as MemoryRepository;

    memoryLlmService = {
      extractGraph: vi.fn().mockResolvedValue({
        entities: [
          { name: 'Alice', type: 'person', confidence: 0.95 },
          { name: 'Memox', type: 'project', confidence: 0.95 },
        ],
        relations: [
          {
            source: 'Alice',
            target: 'Memox',
            relation: 'works on',
            confidence: 0.9,
          },
        ],
      }),
    } as unknown as MemoryLlmService;

    graphScopeService = {
      reconcileProjectionState: vi.fn().mockResolvedValue(undefined),
      markProjectionFailed: vi.fn().mockResolvedValue(undefined),
    } as unknown as GraphScopeService;

    service = new GraphProjectionService(
      vectorPrisma,
      memoryRepository,
      memoryLlmService,
      graphScopeService,
    );
  });

  it('projects memory facts into graph tables within graph scope', async () => {
    await service.projectMemoryFact('api-key-1', 'memory-1');

    expect(memoryRepository.findById).toHaveBeenCalledWith(
      'api-key-1',
      'memory-1',
    );
    expect(memoryLlmService.extractGraph).toHaveBeenCalledWith(
      'Alice works on Memox',
    );
    expect(tx.graphEntity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          graphScopeId: 'graph-scope-1',
        }),
      }),
    );
    expect(tx.graphRelation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          graphScopeId: 'graph-scope-1',
        }),
      }),
    );
    expect(vectorPrisma.memoryFact.update).toHaveBeenCalledWith({
      where: { id: 'memory-1' },
      data: {
        graphProjectionState: 'READY',
        graphProjectionErrorCode: null,
      },
    });
    expect(graphScopeService.reconcileProjectionState).toHaveBeenCalledWith(
      'graph-scope-1',
      {
        touchProjectedAt: true,
      },
    );
  });

  it('cleans up and skips projection when memory has no graph scope', async () => {
    memoryRepository.findById.mockResolvedValueOnce({
      id: 'memory-1',
      content: 'Alice works on Memox',
      graphScopeId: null,
      sourceId: null,
      sourceRevisionId: null,
      updatedAt: new Date('2026-03-20T10:00:00.000Z'),
    });

    await service.projectMemoryFact('api-key-1', 'memory-1');

    expect(vectorPrisma.graphObservation.deleteMany).toHaveBeenCalledWith({
      where: {
        evidenceMemoryId: 'memory-1',
      },
    });
    expect(memoryLlmService.extractGraph).not.toHaveBeenCalled();
  });

  it('keeps low-confidence observations without promoting canonical graph rows', async () => {
    memoryLlmService.extractGraph.mockResolvedValueOnce({
      entities: [
        { name: 'Maybe Alice', type: 'person', confidence: 0.2 },
        { name: 'Maybe Memox', type: 'project', confidence: 0.2 },
      ],
      relations: [
        {
          source: 'Maybe Alice',
          target: 'Maybe Memox',
          relation: 'might_work_on',
          confidence: 0.2,
        },
      ],
    });

    await service.projectMemoryFact('api-key-1', 'memory-1');

    expect(tx.graphEntity.create).not.toHaveBeenCalled();
    expect(tx.graphRelation.create).not.toHaveBeenCalled();
    expect(tx.graphObservation.create).toHaveBeenCalled();
  });

  it('marks the graph scope failed when projection throws', async () => {
    memoryLlmService.extractGraph.mockRejectedValueOnce(
      new Error('llm timeout'),
    );

    await expect(
      service.projectMemoryFact('api-key-1', 'memory-1'),
    ).rejects.toThrow('llm timeout');

    expect(vectorPrisma.memoryFact.update).toHaveBeenCalledWith({
      where: { id: 'memory-1' },
      data: {
        graphProjectionState: 'FAILED',
        graphProjectionErrorCode: 'GRAPH_PROJECTION_FAILED',
      },
    });
    expect(graphScopeService.markProjectionFailed).toHaveBeenCalledWith(
      'graph-scope-1',
      'GRAPH_PROJECTION_FAILED',
      'llm timeout',
    );
  });

  it('reconciles the scope after cleanup removes memory evidence', async () => {
    vectorPrisma.graphObservation.findMany.mockResolvedValueOnce([
      { graphScopeId: 'graph-scope-1' },
    ]);

    await service.cleanupMemoryFactEvidence('memory-1');

    expect(vectorPrisma.graphObservation.deleteMany).toHaveBeenCalledWith({
      where: {
        evidenceMemoryId: 'memory-1',
      },
    });
    expect(graphScopeService.reconcileProjectionState).toHaveBeenCalledWith(
      'graph-scope-1',
      {
        touchProjectedAt: true,
      },
    );
  });

  it('reconciles the explicit scope even when cleanup finds no observations', async () => {
    vectorPrisma.graphObservation.findMany.mockResolvedValueOnce([]);

    await service.cleanupMemoryFactEvidence('memory-1', 'graph-scope-1');

    expect(graphScopeService.reconcileProjectionState).toHaveBeenCalledWith(
      'graph-scope-1',
      {
        touchProjectedAt: true,
      },
    );
  });

  it('drops stale projection jobs when memory hash changes before persist', async () => {
    memoryRepository.findById
      .mockResolvedValueOnce({
        id: 'memory-1',
        content: 'Alice works on Memox',
        hash: 'hash-1',
        graphScopeId: 'graph-scope-1',
        sourceId: 'source-1',
        sourceRevisionId: 'revision-1',
        updatedAt: new Date('2026-03-20T10:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'memory-1',
        content: 'Alice now works on GraphScope',
        hash: 'hash-2',
        graphScopeId: 'graph-scope-1',
        sourceId: 'source-1',
        sourceRevisionId: 'revision-1',
        updatedAt: new Date('2026-03-20T10:01:00.000Z'),
      });

    await service.processJob({
      kind: 'project_memory_fact',
      apiKeyId: 'api-key-1',
      memoryId: 'memory-1',
      graphScopeId: 'graph-scope-1',
      memoryHash: 'hash-1',
      memoryUpdatedAt: '2026-03-20T10:00:00.000Z',
    });

    expect(memoryLlmService.extractGraph).toHaveBeenCalledWith(
      'Alice works on Memox',
    );
    expect(vectorPrisma.graphObservation.deleteMany).not.toHaveBeenCalled();
    expect(vectorPrisma.memoryFact.update).not.toHaveBeenCalled();
    expect(graphScopeService.reconcileProjectionState).not.toHaveBeenCalled();
  });

  it('marks graph scope failed when cleanup job throws', async () => {
    vectorPrisma.graphObservation.deleteMany.mockRejectedValueOnce(
      new Error('cleanup failed'),
    );
    memoryRepository.findById.mockResolvedValueOnce(null);

    await expect(
      service.processJob({
        kind: 'cleanup_memory_fact',
        apiKeyId: 'api-key-1',
        memoryId: 'memory-1',
        graphScopeId: 'graph-scope-1',
        memoryUpdatedAt: '2026-03-20T10:00:00.000Z',
      }),
    ).rejects.toThrow('cleanup failed');

    expect(graphScopeService.markProjectionFailed).toHaveBeenCalledWith(
      'graph-scope-1',
      'GRAPH_PROJECTION_FAILED',
      'cleanup failed',
    );
  });

  it('skips stale cleanup when memory has been re-enabled for graph', async () => {
    memoryRepository.findById.mockResolvedValueOnce({
      id: 'memory-1',
      content: 'Alice works on Memox',
      hash: 'hash-2',
      graphScopeId: 'graph-scope-1',
      sourceId: 'source-1',
      sourceRevisionId: 'revision-2',
      updatedAt: new Date('2026-03-20T10:02:00.000Z'),
    });

    await service.processJob({
      kind: 'cleanup_memory_fact',
      apiKeyId: 'api-key-1',
      memoryId: 'memory-1',
      graphScopeId: 'graph-scope-1',
      memoryUpdatedAt: '2026-03-20T10:00:00.000Z',
    });

    expect(vectorPrisma.graphObservation.deleteMany).not.toHaveBeenCalled();
    expect(graphScopeService.markProjectionFailed).not.toHaveBeenCalled();
  });
});

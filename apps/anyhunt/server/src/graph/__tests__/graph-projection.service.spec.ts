import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GraphProjectionService } from '../graph-projection.service';
import type { VectorPrismaService } from '../../vector-prisma';
import type { MemoryRepository } from '../../memory';
import type { MemoryLlmService } from '../../memory';
import type { R2Service } from '../../storage';

describe('GraphProjectionService', () => {
  let vectorPrisma: any;
  let memoryRepository: any;
  let memoryLlmService: any;
  let r2Service: any;
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
        deleteMany: vi.fn().mockResolvedValue(undefined),
        findMany: vi.fn().mockResolvedValue([]),
      },
      graphRelation: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: `${data.fromEntityId}:${data.toEntityId}:${data.relationType}`,
          ...data,
        })),
        update: vi.fn(),
        deleteMany: vi.fn().mockResolvedValue(undefined),
        findMany: vi.fn().mockResolvedValue([]),
      },
      $executeRaw: vi.fn().mockResolvedValue(undefined),
    };
    vectorPrisma = {
      $transaction: vi.fn(async (callback) => callback(tx)),
      $executeRaw: vi.fn().mockResolvedValue(undefined),
      knowledgeSource: {
        findFirst: vi.fn().mockResolvedValue({ id: 'source-1' }),
      },
      knowledgeSourceRevision: {
        findFirst: vi.fn().mockResolvedValue({
          normalizedTextR2Key: 'tenant/vault/revision-1',
        }),
      },
      graphObservation: {
        deleteMany: vi.fn().mockResolvedValue(undefined),
      },
      graphRelation: {
        deleteMany: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as VectorPrismaService;

    memoryRepository = {
      findById: vi.fn().mockResolvedValue({
        id: 'memory-1',
        content: 'Alice works on Memox',
        graphEnabled: true,
      }),
    } as unknown as MemoryRepository;

    memoryLlmService = {
      extractGraph: vi.fn().mockResolvedValue({
        entities: [
          { name: 'Alice', type: 'person' },
          { name: 'Memox', type: 'project' },
        ],
        relations: [{ source: 'Alice', target: 'Memox', relation: 'works on' }],
      }),
    } as unknown as MemoryLlmService;

    r2Service = {
      downloadStream: vi.fn().mockResolvedValue({
        stream: ReadableFromString('Memox by Alice'),
      }),
    } as unknown as R2Service;

    service = new GraphProjectionService(
      vectorPrisma,
      memoryRepository,
      memoryLlmService,
      r2Service,
    );
  });

  it('projects memory fact entities and relations into graph tables', async () => {
    await service.projectMemoryFact('api-key-1', 'memory-1');
    expect(memoryRepository.findById).toHaveBeenCalledWith(
      'api-key-1',
      'memory-1',
    );
    expect(memoryLlmService.extractGraph).toHaveBeenCalledWith(
      'Alice works on Memox',
    );
    expect(vectorPrisma.$transaction).toHaveBeenCalled();
  });

  it('projects current source revision into graph tables', async () => {
    await service.projectSourceRevision('api-key-1', 'source-1', 'revision-1');
    expect(memoryLlmService.extractGraph).toHaveBeenCalledWith(
      'Memox by Alice',
    );
    expect(vectorPrisma.$transaction).toHaveBeenCalled();
  });

  it('cleanup memory evidence 时不应直接删除 canonical relation', async () => {
    await service.cleanupMemoryFactEvidence('api-key-1', 'memory-1');

    expect(tx.graphObservation.deleteMany).toHaveBeenCalled();
    expect(tx.graphRelation.deleteMany).not.toHaveBeenCalled();
  });

  it('低置信 observation 不应直接创建 canonical entity 与 relation', async () => {
    memoryLlmService.extractGraph.mockResolvedValue({
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

  it('relation 无法升格为 canonical relation 时仍应保留 relation observation', async () => {
    memoryLlmService.extractGraph.mockResolvedValue({
      entities: [
        { name: 'Alice', type: 'person', confidence: 0.95 },
        { name: 'Memox', type: 'project', confidence: 0.2 },
      ],
      relations: [
        {
          source: 'Alice',
          target: 'Memox',
          relation: 'mentions',
          confidence: 0.85,
        },
      ],
    });

    await service.projectMemoryFact('api-key-1', 'memory-1');

    expect(tx.graphRelation.create).not.toHaveBeenCalled();
    expect(tx.graphObservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          graphRelationId: null,
          observationType: 'MEMORY_RELATION',
        }),
      }),
    );
  });
});

function ReadableFromString(value: string) {
  return (async function* generate() {
    yield Buffer.from(value, 'utf8');
  })();
}

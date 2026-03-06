import { describe, expect, it, vi } from 'vitest';
import { GraphContextService } from '../graph-context.service';
import type { VectorPrismaService } from '../../vector-prisma';

describe('GraphContextService', () => {
  it('builds graph context from observations', async () => {
    const vectorPrisma = {
      graphObservation: {
        findMany: vi.fn().mockResolvedValue([
          {
            evidenceMemoryId: 'memory-1',
            graphEntity: {
              id: 'entity-1',
              entityType: 'person',
              canonicalName: 'alice',
              aliases: ['Alice'],
            },
            graphRelation: {
              id: 'relation-1',
              relationType: 'works_on',
              confidence: 0.8,
              fromEntity: {
                id: 'entity-1',
                entityType: 'person',
                canonicalName: 'alice',
                aliases: ['Alice'],
              },
              toEntity: {
                id: 'entity-2',
                entityType: 'project',
                canonicalName: 'memox',
                aliases: ['Memox'],
              },
            },
          },
        ]),
      },
    } as unknown as VectorPrismaService;

    const service = new GraphContextService(vectorPrisma);
    const context = await service.getForMemoryFact('api-key-1', 'memory-1');

    expect(context?.entities).toHaveLength(1);
    expect(context?.relations).toHaveLength(1);
    expect(context?.relations[0].relation_type).toBe('works_on');
  });

  it('builds grouped graph contexts for memory facts in batch', async () => {
    const vectorPrisma = {
      graphObservation: {
        findMany: vi.fn().mockResolvedValue([
          {
            evidenceMemoryId: 'memory-1',
            graphEntity: {
              id: 'entity-1',
              entityType: 'person',
              canonicalName: 'alice',
              aliases: ['Alice'],
            },
            graphRelation: null,
          },
          {
            evidenceMemoryId: 'memory-2',
            graphEntity: {
              id: 'entity-2',
              entityType: 'project',
              canonicalName: 'memox',
              aliases: ['Memox'],
            },
            graphRelation: null,
          },
        ]),
      },
    } as unknown as VectorPrismaService;

    const service = new GraphContextService(vectorPrisma);
    const contexts = await service.getForMemoryFacts('api-key-1', [
      'memory-1',
      'memory-2',
    ]);

    expect(contexts.get('memory-1')?.entities).toHaveLength(1);
    expect(contexts.get('memory-2')?.entities).toHaveLength(1);
  });
});

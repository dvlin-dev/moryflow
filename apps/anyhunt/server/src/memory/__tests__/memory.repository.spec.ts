import { describe, expect, it, vi } from 'vitest';
import { MemoryRepository } from '../memory.repository';

describe('MemoryRepository', () => {
  it('allows explicit null graph fields when updating with embedding', async () => {
    const vectorPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([
        {
          id: 'memory-1',
        },
      ]),
      memoryFact: {},
    } as any;
    const repository = new MemoryRepository(vectorPrisma);

    await repository.updateWithEmbedding(
      'api-key-1',
      'memory-1',
      {
        content: 'Updated memory',
        graphScopeId: null,
        graphProjectionState: 'DISABLED',
        graphProjectionErrorCode: null,
      },
      [0.1, 0.2],
    );

    const [query] = vectorPrisma.$queryRaw.mock.calls[0] as [{ sql: string }];
    expect(query.sql).toContain('"graphScopeId" = ?');
    expect(query.sql).not.toContain('COALESCE(');
  });
});

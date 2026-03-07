import { describe, expect, it, vi } from 'vitest';
import { SourceSearchRepository } from '../source-search.repository';
import type { VectorPrismaService } from '../../vector-prisma';

describe('SourceSearchRepository', () => {
  it('loads chunk windows for shortlisted candidates in one query round-trip', async () => {
    const vectorPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      sourceChunk: {
        findMany: vi.fn(),
      },
    } as unknown as VectorPrismaService;
    const repository = new SourceSearchRepository(vectorPrisma);

    await repository.findChunkWindowsForCandidates(
      'api-key-1',
      [
        {
          revisionId: '11111111-1111-1111-1111-111111111111',
          centerChunkIndex: 1,
        },
        {
          revisionId: '22222222-2222-2222-2222-222222222222',
          centerChunkIndex: 4,
        },
      ],
      1,
    );

    expect((vectorPrisma as any).$queryRaw).toHaveBeenCalledTimes(1);
    expect((vectorPrisma as any).sourceChunk.findMany).not.toHaveBeenCalled();
  });
});

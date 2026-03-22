import { describe, expect, it, vi } from 'vitest';
import { SourceChunkRepository } from '../source-chunk.repository';

function createVectorPrismaMock() {
  return {
    sourceChunk: {},
    $executeRaw: vi.fn().mockReturnValue(Promise.resolve(1)),
    $transaction: vi.fn().mockResolvedValue(undefined),
  };
}

function createVectorPgMock() {
  const client = {
    query: vi.fn().mockResolvedValue({ rowCount: 1 }),
  };

  return {
    client,
    withTransaction: vi.fn(
      async (callback: (tx: typeof client) => Promise<void>) =>
        callback(client),
    ),
  };
}

describe('SourceChunkRepository', () => {
  it('replaces revision chunks through raw pg transaction instead of Prisma raw writes', async () => {
    const vectorPrisma = createVectorPrismaMock();
    const vectorPg = createVectorPgMock();
    const repository = new SourceChunkRepository(
      vectorPrisma as never,
      vectorPg as never,
    );

    await repository.replaceRevisionChunks({
      apiKeyId: 'api-key-1',
      sourceId: 'source-1',
      revisionId: 'revision-1',
      userId: 'user-1',
      agentId: null,
      appId: 'app-1',
      runId: null,
      orgId: null,
      projectId: null,
      chunks: [
        {
          headingPath: ['Doc'],
          content: 'Chunk A',
          tokenCount: 8,
          keywords: ['chunk', 'a'],
          metadata: { sourceType: 'workspace_markdown' },
          embedding: [0.1, 0.2],
        },
        {
          headingPath: ['Doc'],
          content: 'Chunk B',
          tokenCount: 9,
          keywords: ['chunk', 'b'],
          metadata: { sourceType: 'workspace_markdown' },
          embedding: [0.3, 0.4],
        },
      ],
    });

    expect(vectorPg.withTransaction).toHaveBeenCalledTimes(1);
    expect(vectorPg.client.query).toHaveBeenCalledTimes(2);
    expect(vectorPrisma.$transaction).not.toHaveBeenCalled();
    expect(vectorPrisma.$executeRaw).not.toHaveBeenCalled();
  });
});

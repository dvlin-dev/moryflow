import { describe, expect, it, vi } from 'vitest';
import type { VectorPrismaService } from '../../vector-prisma';
import { SourceIngestReadService } from '../source-ingest-read.service';

describe('SourceIngestReadService', () => {
  it('returns semantic indexing counts from the latest revision state query', async () => {
    const vectorPrisma = {
      $queryRaw: vi.fn().mockResolvedValueOnce([
        {
          sourceCount: BigInt(12),
          indexedSourceCount: BigInt(8),
          indexingSourceCount: BigInt(3),
          attentionSourceCount: BigInt(1),
          lastIndexedAt: new Date('2026-03-11T06:00:00.000Z'),
        },
      ]),
    };

    const service = new SourceIngestReadService(
      vectorPrisma as unknown as VectorPrismaService,
    );

    await expect(
      service.getOverview('api-key-1', {
        project_id: 'project-1',
      }),
    ).resolves.toEqual({
      sourceCount: 12,
      indexedSourceCount: 8,
      indexingSourceCount: 3,
      attentionSourceCount: 1,
      lastIndexedAt: '2026-03-11T06:00:00.000Z',
    });

    expect(vectorPrisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('builds SQL from latest revision state instead of source pending/failed flags', async () => {
    const vectorPrisma = {
      $queryRaw: vi.fn().mockResolvedValueOnce([
        {
          sourceCount: BigInt(0),
          indexedSourceCount: BigInt(0),
          indexingSourceCount: BigInt(0),
          attentionSourceCount: BigInt(0),
        },
      ]),
    };

    const service = new SourceIngestReadService(
      vectorPrisma as unknown as VectorPrismaService,
    );

    await service.getOverview('api-key-1', {
      project_id: 'project-1',
      metadata: {
        source_origin: 'moryflow_sync',
      },
    });

    const summarySql = vectorPrisma.$queryRaw.mock.calls[0]?.[0]?.sql ?? '';
    expect(summarySql).toContain(`s."latestRevisionId"`);
    expect(summarySql).toContain(`lr.status = 'FAILED'`);
    expect(summarySql).toContain(
      `lr.status IN ('PENDING_UPLOAD', 'READY_TO_FINALIZE', 'PROCESSING')`,
    );
    expect(summarySql).toContain(`MAX(r."updatedAt")`);
    expect(summarySql).not.toContain(`pending_source_count`);
    expect(summarySql).not.toContain(`s.status = 'FAILED'`);
    expect(summarySql).not.toContain(`s.status = 'PROCESSING'`);
  });

  it('maps source status rows to user-facing knowledge status items', async () => {
    const vectorPrisma = {
      $queryRaw: vi.fn().mockResolvedValueOnce([
        {
          documentId: 'document-1',
          title: 'Doc',
          path: 'notes/doc.md',
          state: 'NEEDS_ATTENTION',
          latestError: 'No indexable text available for indexing',
          lastAttemptAt: new Date('2026-03-11T07:00:00.000Z'),
        },
      ]),
    };

    const service = new SourceIngestReadService(
      vectorPrisma as unknown as VectorPrismaService,
    );

    await expect(
      service.listStatuses(
        'api-key-1',
        {
          project_id: 'project-1',
        },
        'attention',
      ),
    ).resolves.toEqual([
      {
        documentId: 'document-1',
        title: 'Doc',
        path: 'notes/doc.md',
        state: 'NEEDS_ATTENTION',
        userFacingReason: 'This file has no searchable text.',
        lastAttemptAt: '2026-03-11T07:00:00.000Z',
      },
    ]);

    const listSql = vectorPrisma.$queryRaw.mock.calls[0]?.[0]?.sql ?? '';
    expect(listSql).toContain(`state = 'NEEDS_ATTENTION'`);
    expect(listSql).toContain(`lr.error AS "latestError"`);
  });
});

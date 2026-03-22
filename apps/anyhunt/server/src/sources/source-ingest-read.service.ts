import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-vector/client';
import {
  buildScopedSourceSql,
  toIsoStringOrNull,
  toNumberCount,
} from '../common/utils/unified-scope.utils';
import { VectorPrismaService } from '../vector-prisma';
import type {
  SourceIngestListFilter,
  SourceIngestOverview,
  SourceIngestScope,
  SourceIngestStatusItem,
} from './source-ingest-read.types';

type SummaryRow = {
  sourceCount: bigint | number;
  indexedSourceCount: bigint | number;
  indexingSourceCount: bigint | number;
  attentionSourceCount: bigint | number;
  lastIndexedAt: Date | string | null;
};

type StatusRow = {
  documentId: string;
  title: string;
  path: string | null;
  state: 'INDEXING' | 'NEEDS_ATTENTION';
  latestError: string | null;
  lastAttemptAt: Date | string | null;
};

@Injectable()
export class SourceIngestReadService {
  constructor(private readonly vectorPrisma: VectorPrismaService) {}

  async getOverview(
    apiKeyId: string,
    scope: SourceIngestScope,
  ): Promise<SourceIngestOverview> {
    const [summary] = await this.vectorPrisma.$queryRaw<SummaryRow[]>(
      this.buildOverviewSummarySql(apiKeyId, scope),
    );

    return {
      sourceCount: toNumberCount(summary?.sourceCount),
      indexedSourceCount: toNumberCount(summary?.indexedSourceCount),
      indexingSourceCount: toNumberCount(summary?.indexingSourceCount),
      attentionSourceCount: toNumberCount(summary?.attentionSourceCount),
      lastIndexedAt: toIsoStringOrNull(summary?.lastIndexedAt),
    };
  }

  buildOverviewSummarySql(apiKeyId: string, scope: SourceIngestScope) {
    return Prisma.sql`
      WITH scoped_sources AS (
        SELECT
          s.id,
          CASE
            WHEN s."latestRevisionId" IS NULL AND s."currentRevisionId" IS NOT NULL
              THEN 'READY'
            WHEN s."latestRevisionId" IS NULL THEN 'INDEXING'
            WHEN lr.status = 'FAILED' THEN 'NEEDS_ATTENTION'
            WHEN lr.status IN ('PENDING_UPLOAD', 'READY_TO_FINALIZE', 'PROCESSING')
              THEN 'INDEXING'
            WHEN s."currentRevisionId" IS NOT NULL THEN 'READY'
            ELSE 'NEEDS_ATTENTION'
          END AS ingest_state
        FROM "KnowledgeSource" s
        LEFT JOIN "KnowledgeSourceRevision" lr
          ON lr.id = s."latestRevisionId"
        WHERE ${buildScopedSourceSql(apiKeyId, scope, 's')}
      ),
      last_indexed AS (
        SELECT MAX(r."updatedAt") AS "lastIndexedAt"
        FROM "KnowledgeSourceRevision" r
        INNER JOIN "KnowledgeSource" s ON s.id = r."sourceId"
        WHERE r."apiKeyId" = ${apiKeyId}
          AND r.status = 'INDEXED'
          AND ${buildScopedSourceSql(apiKeyId, scope, 's')}
      )
      SELECT
        COUNT(*)::bigint AS "sourceCount",
        COUNT(*) FILTER (WHERE ingest_state = 'READY')::bigint AS "indexedSourceCount",
        COUNT(*) FILTER (WHERE ingest_state = 'INDEXING')::bigint AS "indexingSourceCount",
        COUNT(*) FILTER (WHERE ingest_state = 'NEEDS_ATTENTION')::bigint AS "attentionSourceCount",
        MAX(li."lastIndexedAt") AS "lastIndexedAt"
      FROM scoped_sources
      CROSS JOIN last_indexed li
    `;
  }

  async listStatuses(
    apiKeyId: string,
    scope: SourceIngestScope,
    filter?: SourceIngestListFilter,
  ): Promise<SourceIngestStatusItem[]> {
    const rows = await this.vectorPrisma.$queryRaw<StatusRow[]>(
      this.buildStatusListSql(apiKeyId, scope, filter),
    );

    return rows.map((row) => ({
      documentId: row.documentId,
      title: row.title,
      path: row.path,
      state: row.state,
      userFacingReason: this.toUserFacingReason(row.state, row.latestError),
      lastAttemptAt: toIsoStringOrNull(row.lastAttemptAt),
    }));
  }

  buildStatusListSql(
    apiKeyId: string,
    scope: SourceIngestScope,
    filter?: SourceIngestListFilter,
  ) {
    const stateFilter =
      filter === 'attention'
        ? Prisma.sql`state = 'NEEDS_ATTENTION'`
        : filter === 'indexing'
          ? Prisma.sql`state = 'INDEXING'`
          : Prisma.sql`state <> 'READY'`;

    return Prisma.sql`
      WITH source_states AS (
        SELECT
          COALESCE(s."externalId", s.id)::text AS "documentId",
          s.title,
          s."displayPath" AS path,
          CASE
            WHEN s."latestRevisionId" IS NULL AND s."currentRevisionId" IS NOT NULL
              THEN 'READY'
            WHEN s."latestRevisionId" IS NULL THEN 'INDEXING'
            WHEN lr.status = 'FAILED' THEN 'NEEDS_ATTENTION'
            WHEN lr.status IN ('PENDING_UPLOAD', 'READY_TO_FINALIZE', 'PROCESSING')
              THEN 'INDEXING'
            WHEN s."currentRevisionId" IS NOT NULL THEN 'READY'
            ELSE 'NEEDS_ATTENTION'
          END AS state,
          lr.error AS "latestError",
          COALESCE(lr."updatedAt", s."updatedAt") AS "lastAttemptAt"
        FROM "KnowledgeSource" s
        LEFT JOIN "KnowledgeSourceRevision" lr
          ON lr.id = s."latestRevisionId"
        WHERE ${buildScopedSourceSql(apiKeyId, scope, 's')}
      )
      SELECT
        "documentId",
        title,
        path,
        state,
        "latestError",
        "lastAttemptAt"
      FROM source_states
      WHERE ${stateFilter}
      ORDER BY "lastAttemptAt" DESC NULLS LAST, title ASC
    `;
  }
  private toUserFacingReason(
    state: StatusRow['state'],
    latestError: string | null,
  ): string | null {
    if (state === 'INDEXING') {
      return 'Indexing is in progress.';
    }

    const normalizedError = latestError?.toLowerCase() ?? '';
    if (
      normalizedError.includes('no indexable text') ||
      normalizedError.includes('no retrievable chunks')
    ) {
      return 'This file has no searchable text.';
    }

    return 'The latest indexing attempt failed.';
  }
}

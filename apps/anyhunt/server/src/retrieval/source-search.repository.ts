/**
 * [INPUT]: apiKeyId + source search params
 * [OUTPUT]: current revision chunk hits + chunk windows
 * [POS]: Source 检索仓储（只负责 SourceChunk/KnowledgeSource 查询）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-vector/client';
import { VectorPrismaService } from '../vector-prisma';
import type {
  RetrievalScopeFilters,
  SourceChunkSearchRow,
  SourceChunkWindowCandidate,
  SourceChunkWindowRow,
} from './retrieval.types';

@Injectable()
export class SourceSearchRepository {
  constructor(private readonly vectorPrisma: VectorPrismaService) {}

  async searchSimilar(params: {
    apiKeyId: string;
    embedding: number[];
    limit: number;
    threshold: number;
    filters: RetrievalScopeFilters;
  }): Promise<SourceChunkSearchRow[]> {
    const { apiKeyId, embedding, limit, threshold, filters } = params;
    const embeddingStr = `[${embedding.join(',')}]`;
    const whereClause = this.buildWhereSql(apiKeyId, filters);

    return this.vectorPrisma.$queryRaw<SourceChunkSearchRow[]>(Prisma.sql`
      SELECT
        c.id::text as "chunkId",
        c."sourceId"::text as "sourceId",
        c."revisionId"::text as "revisionId",
        c."chunkIndex" as "chunkIndex",
        c."chunkCount" as "chunkCount",
        c.content,
        s."sourceType" as "sourceType",
        s."externalId" as "externalId",
        s."projectId" as "projectId",
        s."displayPath" as "displayPath",
        s.title,
        s.metadata as "sourceMetadata",
        1 - (c.embedding <=> ${embeddingStr}::vector) as score
      FROM "SourceChunk" c
      INNER JOIN "KnowledgeSource" s ON s.id = c."sourceId"
      WHERE ${whereClause}
        AND c.embedding IS NOT NULL
        AND 1 - (c.embedding <=> ${embeddingStr}::vector) > ${threshold}
      ORDER BY score DESC
      LIMIT ${limit}
    `);
  }

  async searchByKeyword(params: {
    apiKeyId: string;
    query: string;
    queryTokens: string[];
    limit: number;
    filters: RetrievalScopeFilters;
  }): Promise<SourceChunkSearchRow[]> {
    const { apiKeyId, query, queryTokens, limit, filters } = params;
    const whereClause = this.buildWhereSql(apiKeyId, filters);
    const pattern = `%${query}%`;
    const tokenArray = this.buildTextArray(queryTokens);
    const hasTokens = queryTokens.length > 0;

    return this.vectorPrisma.$queryRaw<SourceChunkSearchRow[]>(Prisma.sql`
      SELECT
        c.id::text as "chunkId",
        c."sourceId"::text as "sourceId",
        c."revisionId"::text as "revisionId",
        c."chunkIndex" as "chunkIndex",
        c."chunkCount" as "chunkCount",
        c.content,
        s."sourceType" as "sourceType",
        s."externalId" as "externalId",
        s."projectId" as "projectId",
        s."displayPath" as "displayPath",
        s.title,
        s.metadata as "sourceMetadata",
        (
          CASE WHEN c.content ILIKE ${pattern} THEN 1 ELSE 0 END +
          CASE WHEN ${hasTokens} AND c.keywords && ${tokenArray} THEN 1 ELSE 0 END
        )::float as score
      FROM "SourceChunk" c
      INNER JOIN "KnowledgeSource" s ON s.id = c."sourceId"
      WHERE ${whereClause}
        AND (
          c.content ILIKE ${pattern}
          OR (${hasTokens} AND c.keywords && ${tokenArray})
        )
      ORDER BY score DESC, c."updatedAt" DESC
      LIMIT ${limit}
    `);
  }

  async findChunkWindowsForCandidates(
    apiKeyId: string,
    candidates: SourceChunkWindowCandidate[],
    radius: number,
  ): Promise<SourceChunkWindowRow[]> {
    if (candidates.length === 0) {
      return [];
    }

    const candidateValues = candidates.map(
      (candidate) =>
        Prisma.sql`(${candidate.revisionId}::uuid, ${candidate.centerChunkIndex})`,
    );

    return this.vectorPrisma.$queryRaw<SourceChunkWindowRow[]>(Prisma.sql`
      WITH "CandidateWindow" ("revisionId", "centerChunkIndex") AS (
        VALUES ${Prisma.join(candidateValues)}
      )
      SELECT
        c."revisionId"::text as "revisionId",
        cw."centerChunkIndex" as "centerChunkIndex",
        c."chunkIndex" as "chunkIndex",
        c.content as content
      FROM "CandidateWindow" cw
      INNER JOIN "SourceChunk" c
        ON c."revisionId" = cw."revisionId"
      WHERE c."apiKeyId" = ${apiKeyId}
        AND c."chunkIndex" BETWEEN GREATEST(cw."centerChunkIndex" - ${radius}, 0)
          AND cw."centerChunkIndex" + ${radius}
      ORDER BY c."revisionId", cw."centerChunkIndex", c."chunkIndex"
    `);
  }

  private buildWhereSql(
    apiKeyId: string,
    filters: RetrievalScopeFilters,
  ): Prisma.Sql {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`c."apiKeyId" = ${apiKeyId}`,
      Prisma.sql`s."apiKeyId" = ${apiKeyId}`,
      Prisma.sql`s."currentRevisionId" = c."revisionId"`,
      Prisma.sql`s.status = 'ACTIVE'`,
    ];

    if (filters.userId) {
      conditions.push(Prisma.sql`s."userId" = ${filters.userId}`);
    }
    if (filters.agentId) {
      conditions.push(Prisma.sql`s."agentId" = ${filters.agentId}`);
    }
    if (filters.appId) {
      conditions.push(Prisma.sql`s."appId" = ${filters.appId}`);
    }
    if (filters.runId) {
      conditions.push(Prisma.sql`s."runId" = ${filters.runId}`);
    }
    if (filters.orgId) {
      conditions.push(Prisma.sql`s."orgId" = ${filters.orgId}`);
    }
    if (filters.projectId) {
      conditions.push(Prisma.sql`s."projectId" = ${filters.projectId}`);
    }
    if (filters.metadata && Object.keys(filters.metadata).length > 0) {
      conditions.push(
        Prisma.sql`s.metadata @> ${JSON.stringify(filters.metadata)}::jsonb`,
      );
    }
    if (filters.sourceTypes && filters.sourceTypes.length > 0) {
      conditions.push(
        Prisma.sql`s."sourceType" IN (${Prisma.join(filters.sourceTypes)})`,
      );
    }

    return Prisma.sql`${Prisma.join(conditions, ' AND ')}`;
  }

  private buildTextArray(values: string[]): Prisma.Sql {
    if (values.length === 0) {
      return Prisma.sql`ARRAY[]::text[]`;
    }

    return Prisma.sql`ARRAY[${Prisma.join(values)}]::text[]`;
  }
}

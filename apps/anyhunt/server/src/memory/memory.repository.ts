/**
 * [INPUT]: apiKeyId, embedding, search filters（含 DSL 与 metadata JSON）
 * [OUTPUT]: Memory, MemoryWithSimilarity[]
 * [POS]: Memory Repository（向量数据库）
 *
 * 职责：Memory 数据访问层，包含向量搜索与向量写入（含 hash 更新）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type Memory as PrismaMemory,
} from '../../generated/prisma-vector/client';
import { VectorPrismaService } from '../vector-prisma/vector-prisma.service';
import { BaseRepository } from '../common/base.repository';
import type { MemorySearchFilters } from './filters/memory-filters.types';
import { MemoryFilterBuilder } from './filters/memory-filter.builder';

export type Memory = PrismaMemory;

export interface MemoryWithSimilarity extends Memory {
  similarity: number;
}

export type { MemorySearchFilters } from './filters/memory-filters.types';

@Injectable()
export class MemoryRepository extends BaseRepository<Memory> {
  private readonly filterBuilder = new MemoryFilterBuilder();

  constructor(private readonly vectorPrisma: VectorPrismaService) {
    super(vectorPrisma, vectorPrisma.memory);
  }

  /**
   * 向量相似度搜索
   */
  async searchSimilar(params: {
    apiKeyId: string;
    embedding: number[];
    limit: number;
    threshold: number;
    filters: MemorySearchFilters;
  }): Promise<MemoryWithSimilarity[]> {
    const { apiKeyId, embedding, limit, threshold, filters } = params;
    const embeddingStr = `[${embedding.join(',')}]`;
    const whereClause = this.filterBuilder.buildWhereSql(apiKeyId, filters);

    const query = Prisma.sql`
      SELECT
        id::text,
        "apiKeyId",
        "userId",
        "agentId",
        "appId",
        "runId",
        "orgId",
        "projectId",
        memory,
        input,
        metadata,
        categories,
        keywords,
        hash,
        immutable,
        "expirationDate",
        timestamp,
        entities,
        relations,
        "createdAt",
        "updatedAt",
        1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM "Memory"
      WHERE ${whereClause}
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> ${embeddingStr}::vector) > ${threshold}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    return this.vectorPrisma.$queryRaw<MemoryWithSimilarity[]>(query);
  }

  /**
   * 关键词搜索（非向量）
   */
  async searchByKeyword(params: {
    apiKeyId: string;
    query: string;
    limit: number;
    filters: MemorySearchFilters;
  }): Promise<Memory[]> {
    const { apiKeyId, query, limit, filters } = params;
    const whereClause = this.filterBuilder.buildWhereSql(apiKeyId, filters);
    const pattern = `%${query}%`;

    const querySql = Prisma.sql`
      SELECT
        id::text,
        "apiKeyId",
        "userId",
        "agentId",
        "appId",
        "runId",
        "orgId",
        "projectId",
        memory,
        input,
        metadata,
        categories,
        keywords,
        hash,
        immutable,
        "expirationDate",
        timestamp,
        entities,
        relations,
        "createdAt",
        "updatedAt"
      FROM "Memory"
      WHERE ${whereClause}
        AND memory ILIKE ${pattern}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;

    return this.vectorPrisma.$queryRaw<Memory[]>(querySql);
  }

  /**
   * 过滤条件查询
   */
  async listByFilters(params: {
    apiKeyId: string;
    filters: MemorySearchFilters;
    limit?: number;
    offset?: number;
  }): Promise<Memory[]> {
    const { apiKeyId, filters, limit, offset } = params;
    const whereClause = this.filterBuilder.buildWhereSql(apiKeyId, filters);
    const limitClause =
      typeof limit === 'number' ? Prisma.sql`LIMIT ${limit}` : Prisma.sql``;
    const offsetClause =
      typeof offset === 'number' ? Prisma.sql`OFFSET ${offset}` : Prisma.sql``;

    const querySql = Prisma.sql`
      SELECT
        id::text,
        "apiKeyId",
        "userId",
        "agentId",
        "appId",
        "runId",
        "orgId",
        "projectId",
        memory,
        input,
        metadata,
        categories,
        keywords,
        hash,
        immutable,
        "expirationDate",
        timestamp,
        entities,
        relations,
        "createdAt",
        "updatedAt"
      FROM "Memory"
      WHERE ${whereClause}
      ORDER BY "createdAt" DESC
      ${limitClause}
      ${offsetClause}
    `;

    return this.vectorPrisma.$queryRaw<Memory[]>(querySql);
  }

  /**
   * 创建 Memory 并存储向量
   */
  async createWithEmbedding(
    apiKeyId: string,
    data: Omit<Memory, 'id' | 'apiKeyId' | 'createdAt' | 'updatedAt'>,
    embedding: number[],
  ): Promise<Memory> {
    const embeddingStr = `[${embedding.join(',')}]`;

    const query = Prisma.sql`
      INSERT INTO "Memory" (
        "apiKeyId",
        "userId",
        "agentId",
        "appId",
        "runId",
        "orgId",
        "projectId",
        memory,
        input,
        metadata,
        categories,
        keywords,
        hash,
        immutable,
        "expirationDate",
        timestamp,
        entities,
        relations,
        embedding,
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${apiKeyId},
        ${data.userId ?? null},
        ${data.agentId ?? null},
        ${data.appId ?? null},
        ${data.runId ?? null},
        ${data.orgId ?? null},
        ${data.projectId ?? null},
        ${data.memory},
        ${data.input ?? null},
        ${data.metadata ?? null},
        ${data.categories ?? []},
        ${data.keywords ?? []},
        ${data.hash ?? null},
        ${data.immutable ?? false},
        ${data.expirationDate ?? null},
        ${data.timestamp ?? null},
        ${data.entities ?? null},
        ${data.relations ?? null},
        ${embeddingStr}::vector,
        NOW(),
        NOW()
      )
      RETURNING
        id::text,
        "apiKeyId",
        "userId",
        "agentId",
        "appId",
        "runId",
        "orgId",
        "projectId",
        memory,
        input,
        metadata,
        categories,
        keywords,
        hash,
        immutable,
        "expirationDate",
        timestamp,
        entities,
        relations,
        "createdAt",
        "updatedAt"
    `;

    const result = await this.vectorPrisma.$queryRaw<Memory[]>(query);
    return result[0];
  }

  /**
   * 更新 Memory 并刷新向量
   */
  async updateWithEmbedding(
    apiKeyId: string,
    id: string,
    data: Partial<Memory>,
    embedding: number[],
  ): Promise<Memory> {
    const embeddingStr = `[${embedding.join(',')}]`;

    const query = Prisma.sql`
      UPDATE "Memory"
      SET
        memory = COALESCE(${data.memory ?? null}, memory),
        metadata = COALESCE(${data.metadata ?? null}, metadata),
        categories = COALESCE(${data.categories ?? null}, categories),
        keywords = COALESCE(${data.keywords ?? null}, keywords),
        hash = COALESCE(${data.hash ?? null}, hash),
        embedding = ${embeddingStr}::vector,
        "updatedAt" = NOW()
      WHERE "apiKeyId" = ${apiKeyId}
        AND id = ${id}
      RETURNING
        id::text,
        "apiKeyId",
        "userId",
        "agentId",
        "appId",
        "runId",
        "orgId",
        "projectId",
        memory,
        input,
        metadata,
        categories,
        keywords,
        hash,
        immutable,
        "expirationDate",
        timestamp,
        entities,
        relations,
        "createdAt",
        "updatedAt"
    `;

    const result = await this.vectorPrisma.$queryRaw<Memory[]>(query);
    return result[0];
  }
}

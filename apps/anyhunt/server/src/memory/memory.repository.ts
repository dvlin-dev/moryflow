/**
 * [INPUT]: apiKeyId, embedding, search filters（含 DSL 与 metadata JSON）
 * [OUTPUT]: MemoryFact, MemoryFactWithSimilarity[]
 * [POS]: MemoryFact Repository（向量数据库）
 *
 * 职责：MemoryFact 数据访问层，包含向量搜索与向量写入（含 hash 更新）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  Prisma,
  type MemoryFact as PrismaMemoryFact,
} from '../../generated/prisma-vector/client';
import { VectorPrismaService } from '../vector-prisma/vector-prisma.service';
import { BaseRepository } from '../common/base.repository';
import type { MemorySearchFilters } from './filters/memory-filters.types';
import { MemoryFilterBuilder } from './filters/memory-filter.builder';
import { toSqlJson } from './utils/memory-json.utils';

export type MemoryFact = PrismaMemoryFact;
export type Memory = MemoryFact;

export interface MemoryFactWithSimilarity extends MemoryFact {
  similarity: number;
}
export type MemoryWithSimilarity = MemoryFactWithSimilarity;

type QueryRawExecutor = {
  $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>;
};

export type { MemorySearchFilters } from './filters/memory-filters.types';

@Injectable()
export class MemoryRepository extends BaseRepository<Memory> {
  private readonly filterBuilder = new MemoryFilterBuilder();

  constructor(private readonly vectorPrisma: VectorPrismaService) {
    super(vectorPrisma, vectorPrisma.memoryFact);
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
        content,
        input,
        metadata,
        categories,
        keywords,
        hash,
        immutable,
        "graphScopeId",
        "graphProjectionState",
        "graphProjectionErrorCode",
        "expirationDate",
        timestamp,
        "originKind",
        "sourceId",
        "sourceRevisionId",
        "derivedKey",
        "createdAt",
        "updatedAt",
        1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM "MemoryFact"
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
        content,
        input,
        metadata,
        categories,
        keywords,
        hash,
        immutable,
        "graphScopeId",
        "graphProjectionState",
        "graphProjectionErrorCode",
        "expirationDate",
        timestamp,
        "originKind",
        "sourceId",
        "sourceRevisionId",
        "derivedKey",
        "createdAt",
        "updatedAt"
      FROM "MemoryFact"
      WHERE ${whereClause}
        AND content ILIKE ${pattern}
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
        content,
        input,
        metadata,
        categories,
        keywords,
        hash,
        immutable,
        "graphScopeId",
        "graphProjectionState",
        "graphProjectionErrorCode",
        "expirationDate",
        timestamp,
        "originKind",
        "sourceId",
        "sourceRevisionId",
        "derivedKey",
        "createdAt",
        "updatedAt"
      FROM "MemoryFact"
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
    executor?: QueryRawExecutor,
  ): Promise<Memory> {
    const embeddingStr = `[${embedding.join(',')}]`;
    const db = executor ?? this.vectorPrisma;

    const query = Prisma.sql`
      INSERT INTO "MemoryFact" (
        id,
        "apiKeyId",
        "userId",
        "agentId",
        "appId",
        "runId",
        "orgId",
        "projectId",
        content,
        input,
        metadata,
        categories,
        keywords,
        hash,
        immutable,
        "graphScopeId",
        "graphProjectionState",
        "graphProjectionErrorCode",
        "expirationDate",
        timestamp,
        "originKind",
        "sourceId",
        "sourceRevisionId",
        "derivedKey",
        embedding,
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${randomUUID()},
        ${apiKeyId},
        ${data.userId ?? null},
        ${data.agentId ?? null},
        ${data.appId ?? null},
        ${data.runId ?? null},
        ${data.orgId ?? null},
        ${data.projectId ?? null},
        ${data.content},
        ${toSqlJson(data.input)},
        ${toSqlJson(data.metadata)},
        ${data.categories ?? []},
        ${data.keywords ?? []},
        ${data.hash ?? null},
        ${data.immutable ?? false},
        ${data.graphScopeId ?? null},
        ${data.graphProjectionState ?? 'DISABLED'},
        ${data.graphProjectionErrorCode ?? null},
        ${data.expirationDate ?? null},
        ${data.timestamp ?? null},
        ${data.originKind},
        ${data.sourceId ?? null},
        ${data.sourceRevisionId ?? null},
        ${data.derivedKey ?? null},
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
        content,
        input,
        metadata,
        categories,
        keywords,
        hash,
        immutable,
        "graphScopeId",
        "graphProjectionState",
        "graphProjectionErrorCode",
        "expirationDate",
        timestamp,
        "originKind",
        "sourceId",
        "sourceRevisionId",
        "derivedKey",
        "createdAt",
        "updatedAt"
    `;

    const result = await db.$queryRaw<Memory[]>(query);
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
    executor?: QueryRawExecutor,
  ): Promise<Memory> {
    const embeddingStr = `[${embedding.join(',')}]`;
    const db = executor ?? this.vectorPrisma;
    const assignments: Prisma.Sql[] = [];
    const hasField = <K extends keyof Memory>(field: K) =>
      Object.prototype.hasOwnProperty.call(data, field) &&
      data[field] !== undefined;

    if (hasField('content')) {
      assignments.push(Prisma.sql`content = ${data.content}`);
    }
    if (hasField('metadata')) {
      assignments.push(Prisma.sql`metadata = ${toSqlJson(data.metadata)}`);
    }
    if (hasField('categories')) {
      assignments.push(Prisma.sql`categories = ${data.categories}`);
    }
    if (hasField('keywords')) {
      assignments.push(Prisma.sql`keywords = ${data.keywords}`);
    }
    if (hasField('hash')) {
      assignments.push(Prisma.sql`hash = ${data.hash}`);
    }
    if (hasField('immutable')) {
      assignments.push(Prisma.sql`immutable = ${data.immutable}`);
    }
    if (hasField('graphScopeId')) {
      assignments.push(Prisma.sql`"graphScopeId" = ${data.graphScopeId}`);
    }
    if (hasField('graphProjectionState')) {
      assignments.push(
        Prisma.sql`"graphProjectionState" = ${data.graphProjectionState}`,
      );
    }
    if (hasField('graphProjectionErrorCode')) {
      assignments.push(
        Prisma.sql`"graphProjectionErrorCode" = ${data.graphProjectionErrorCode}`,
      );
    }
    if (hasField('originKind')) {
      assignments.push(Prisma.sql`"originKind" = ${data.originKind}`);
    }
    if (hasField('sourceId')) {
      assignments.push(Prisma.sql`"sourceId" = ${data.sourceId}`);
    }
    if (hasField('sourceRevisionId')) {
      assignments.push(
        Prisma.sql`"sourceRevisionId" = ${data.sourceRevisionId}`,
      );
    }
    if (hasField('derivedKey')) {
      assignments.push(Prisma.sql`"derivedKey" = ${data.derivedKey}`);
    }
    assignments.push(Prisma.sql`embedding = ${embeddingStr}::vector`);
    assignments.push(Prisma.sql`"updatedAt" = NOW()`);

    const query = Prisma.sql`
      UPDATE "MemoryFact"
      SET ${Prisma.join(assignments, ', ')}
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
        content,
        input,
        metadata,
        categories,
        keywords,
        hash,
        immutable,
        "graphScopeId",
        "graphProjectionState",
        "graphProjectionErrorCode",
        "expirationDate",
        timestamp,
        "originKind",
        "sourceId",
        "sourceRevisionId",
        "derivedKey",
        "createdAt",
        "updatedAt"
    `;

    const result = await db.$queryRaw<Memory[]>(query);
    return result[0];
  }
}

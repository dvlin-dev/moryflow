/**
 * [INPUT]: apiKeyId, userId, embedding, agentId/sessionId filters
 * [OUTPUT]: Memory, MemoryWithSimilarity[]
 * [POS]: Memory Repository（向量数据库）
 *
 * 职责：Memory 数据访问层，包含向量搜索
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import type { Memory as PrismaMemory } from '../../generated/prisma-vector/client';
import { VectorPrismaService } from '../vector-prisma/vector-prisma.service';
import { BaseRepository } from '../common/base.repository';

export type Memory = PrismaMemory;

export interface MemoryWithSimilarity extends Memory {
  similarity: number;
}

@Injectable()
export class MemoryRepository extends BaseRepository<Memory> {
  constructor(private readonly vectorPrisma: VectorPrismaService) {
    super(vectorPrisma, vectorPrisma.memory);
  }

  /**
   * 向量相似度搜索
   */
  async searchSimilar(
    apiKeyId: string,
    userId: string,
    embedding: number[],
    limit: number = 10,
    threshold: number = 0.7,
    agentId?: string,
    sessionId?: string,
  ): Promise<MemoryWithSimilarity[]> {
    const embeddingStr = `[${embedding.join(',')}]`;

    // 构建额外的过滤条件
    let extraConditions = '';
    if (agentId) {
      extraConditions += ` AND "agentId" = '${agentId}'`;
    }
    if (sessionId) {
      extraConditions += ` AND "sessionId" = '${sessionId}'`;
    }

    const result = await this.vectorPrisma.$queryRawUnsafe<
      MemoryWithSimilarity[]
    >(`
      SELECT
        id::text,
        "apiKeyId",
        "userId",
        "agentId",
        "sessionId",
        content,
        metadata,
        source,
        importance,
        tags,
        "createdAt",
        "updatedAt",
        1 - (embedding <=> '${embeddingStr}'::vector) as similarity
      FROM "Memory"
      WHERE "apiKeyId" = '${apiKeyId}'
        AND "userId" = '${userId}'
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> '${embeddingStr}'::vector) > ${threshold}
        ${extraConditions}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `);

    return result;
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

    const result = await this.vectorPrisma.$queryRawUnsafe<Memory[]>(`
      INSERT INTO "Memory" (
        "apiKeyId", "userId", "agentId", "sessionId", content, metadata, source, importance, tags, embedding, "createdAt", "updatedAt"
      ) VALUES (
        '${apiKeyId}',
        '${data.userId}',
        ${data.agentId ? `'${data.agentId}'` : 'NULL'},
        ${data.sessionId ? `'${data.sessionId}'` : 'NULL'},
        '${data.content.replace(/'/g, "''")}',
        ${data.metadata ? `'${JSON.stringify(data.metadata)}'::jsonb` : 'NULL'},
        ${data.source ? `'${data.source}'` : 'NULL'},
        ${data.importance ?? 0.5},
        ARRAY[${data.tags?.map((t) => `'${t}'`).join(',') || ''}]::text[],
        '${embeddingStr}'::vector,
        NOW(),
        NOW()
      )
      RETURNING
        id::text,
        "apiKeyId",
        "userId",
        "agentId",
        "sessionId",
        content,
        metadata,
        source,
        importance,
        tags,
        "createdAt",
        "updatedAt"
    `);

    return result[0];
  }
}

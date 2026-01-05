/**
 * [POS]: Memory Repository
 *
 * 职责：Memory 数据访问层，包含向量搜索
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/base.repository';

export interface Memory {
  id: string;
  apiKeyId: string;
  userId: string;
  agentId?: string | null;
  sessionId?: string | null;
  content: string;
  metadata?: Record<string, any> | null;
  source?: string | null;
  importance?: number | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryWithSimilarity extends Memory {
  similarity: number;
}

@Injectable()
export class MemoryRepository extends BaseRepository<Memory> {
  constructor(prisma: PrismaService) {
    super(prisma, 'memory');
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
      extraConditions += ` AND agent_id = '${agentId}'`;
    }
    if (sessionId) {
      extraConditions += ` AND session_id = '${sessionId}'`;
    }

    const result = await this.prisma.$queryRawUnsafe<MemoryWithSimilarity[]>(`
      SELECT
        id::text,
        api_key_id as "apiKeyId",
        user_id as "userId",
        agent_id as "agentId",
        session_id as "sessionId",
        content,
        metadata,
        source,
        importance,
        tags,
        created_at as "createdAt",
        updated_at as "updatedAt",
        1 - (embedding <=> '${embeddingStr}'::vector) as similarity
      FROM "Memory"
      WHERE api_key_id = '${apiKeyId}'
        AND user_id = '${userId}'
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

    const result = await this.prisma.$queryRawUnsafe<Memory[]>(`
      INSERT INTO "Memory" (
        api_key_id, user_id, agent_id, session_id, content, metadata, source, importance, tags, embedding, created_at, updated_at
      ) VALUES (
        '${apiKeyId}',
        '${data.userId}',
        ${data.agentId ? `'${data.agentId}'` : 'NULL'},
        ${data.sessionId ? `'${data.sessionId}'` : 'NULL'},
        '${data.content.replace(/'/g, "''")}',
        ${data.metadata ? `'${JSON.stringify(data.metadata)}'::jsonb` : 'NULL'},
        ${data.source ? `'${data.source}'` : 'NULL'},
        ${data.importance ?? 0.5},
        ARRAY[${data.tags?.map(t => `'${t}'`).join(',') || ''}]::text[],
        '${embeddingStr}'::vector,
        NOW(),
        NOW()
      )
      RETURNING
        id::text,
        api_key_id as "apiKeyId",
        user_id as "userId",
        agent_id as "agentId",
        session_id as "sessionId",
        content,
        metadata,
        source,
        importance,
        tags,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `);

    return result[0];
  }
}

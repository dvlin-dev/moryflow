/**
 * [INPUT]: platformUserId, apiKeyId, CreateMemoryInput, SearchMemoryInput
 * [OUTPUT]: Memory, MemoryWithSimilarity[]
 * [POS]: Memory 业务逻辑层（跨库查询：主库 ApiKey + 向量库 Memory）
 *
 * 职责：Memory 的 CRUD 和语义搜索
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VectorPrismaService } from '../vector-prisma/vector-prisma.service';
import { asRecordOrNull } from '../common/utils';
import {
  MemoryRepository,
  Memory,
  MemoryWithSimilarity,
} from './memory.repository';
import { EmbeddingService } from '../embedding/embedding.service';
import { BillingService } from '../billing/billing.service';
import type { CreateMemoryInput, SearchMemoryInput } from './dto';
import { randomUUID } from 'crypto';

export type MemoryWithApiKeyName = Omit<Memory, 'metadata'> & {
  metadata: Record<string, unknown> | null;
  apiKeyName: string;
};

export interface ListMemoriesByUserOptions {
  apiKeyId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Escape a value for CSV according to RFC 4180
 * - Fields containing commas, double quotes, or newlines must be quoted
 * - Double quotes within fields must be escaped by doubling them
 */
function escapeCsvField(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // If field contains special characters, wrap in quotes and escape internal quotes
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly repository: MemoryRepository,
    private readonly prisma: PrismaService,
    private readonly vectorPrisma: VectorPrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly billingService: BillingService,
  ) {}

  /**
   * 从 Map 中获取 ApiKey 名称，找不到时记录告警
   */
  private resolveApiKeyName(
    apiKeyId: string,
    resourceId: string,
    map: Map<string, string>,
  ): string {
    const name = map.get(apiKeyId);
    if (!name) {
      this.logger.warn(
        `Memory ${resourceId} references unknown apiKeyId: ${apiKeyId}`,
      );
    }
    return name ?? 'Unknown';
  }

  /**
   * 创建 Memory
   */
  async create(
    platformUserId: string,
    apiKeyId: string,
    dto: CreateMemoryInput,
  ): Promise<Memory> {
    const billingKey = 'memox.memory.create' as const;
    const referenceId = randomUUID();
    const billing = await this.billingService.deductOrThrow({
      userId: platformUserId,
      billingKey,
      referenceId,
    });

    try {
      // 生成向量
      const embeddingResult = await this.embeddingService.generateEmbedding(
        dto.content,
      );

      // 创建 Memory
      const memory = await this.repository.createWithEmbedding(
        apiKeyId,
        {
          userId: dto.userId,
          agentId: dto.agentId ?? null,
          sessionId: dto.sessionId ?? null,
          content: dto.content,
          metadata: dto.metadata ?? null,
          source: dto.source ?? null,
          importance: dto.importance ?? null,
          tags: dto.tags ?? [],
        },
        embeddingResult.embedding,
      );

      this.logger.log(`Created memory ${memory.id} for user ${dto.userId}`);
      return memory;
    } catch (error) {
      if (billing) {
        await this.billingService.refundOnFailure({
          userId: platformUserId,
          billingKey,
          referenceId,
          breakdown: billing.deduct.breakdown,
        });
      }
      throw error;
    }
  }

  /**
   * 语义搜索 Memory
   */
  async search(
    platformUserId: string,
    apiKeyId: string,
    dto: SearchMemoryInput,
  ): Promise<MemoryWithSimilarity[]> {
    const billingKey = 'memox.memory.search' as const;
    const referenceId = randomUUID();
    const billing = await this.billingService.deductOrThrow({
      userId: platformUserId,
      billingKey,
      referenceId,
    });

    try {
      // 生成查询向量
      const embeddingResult = await this.embeddingService.generateEmbedding(
        dto.query,
      );

      // 搜索相似 Memory
      const memories = await this.repository.searchSimilar(
        apiKeyId,
        dto.userId,
        embeddingResult.embedding,
        dto.limit,
        dto.threshold,
        dto.agentId,
        dto.sessionId,
      );

      return memories;
    } catch (error) {
      if (billing) {
        await this.billingService.refundOnFailure({
          userId: platformUserId,
          billingKey,
          referenceId,
          breakdown: billing.deduct.breakdown,
        });
      }
      throw error;
    }
  }

  /**
   * 列出用户的 Memory
   */
  async list(
    apiKeyId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      agentId?: string;
      sessionId?: string;
    } = {},
  ): Promise<Memory[]> {
    const where: Record<string, any> = { userId };
    if (options.agentId) {
      where.agentId = options.agentId;
    }
    if (options.sessionId) {
      where.sessionId = options.sessionId;
    }

    return this.repository.findMany(apiKeyId, {
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit ?? 20,
      skip: options.offset ?? 0,
    });
  }

  /**
   * 获取单个 Memory
   */
  async getById(apiKeyId: string, id: string): Promise<Memory | null> {
    return this.repository.findById(apiKeyId, id);
  }

  /**
   * 删除 Memory
   */
  async delete(apiKeyId: string, id: string): Promise<void> {
    await this.repository.deleteById(apiKeyId, id);
    this.logger.log(`Deleted memory ${id}`);
  }

  /**
   * 删除用户的所有 Memory
   */
  async deleteByUser(apiKeyId: string, userId: string): Promise<void> {
    await this.repository.delete(apiKeyId, { userId });
    this.logger.log(`Deleted all memories for user ${userId}`);
  }

  /**
   * 获取用户所有 API Keys 下的 Memories（Console 用）
   * 跨库查询：主库查 ApiKey，向量库查 Memory
   */
  async listByUser(
    userId: string,
    options: ListMemoriesByUserOptions = {},
  ): Promise<{ memories: MemoryWithApiKeyName[]; total: number }> {
    const { apiKeyId, limit = 20, offset = 0 } = options;

    // 1. 从主库获取用户的 ApiKey 列表（用于过滤和获取名称）
    const apiKeys = await this.prisma.apiKey.findMany({
      where: apiKeyId ? { id: apiKeyId, userId } : { userId },
      select: { id: true, name: true },
    });

    if (apiKeys.length === 0) {
      return { memories: [], total: 0 };
    }

    const apiKeyIds = apiKeys.map((k) => k.id);
    const apiKeyNameMap = new Map(apiKeys.map((k) => [k.id, k.name]));

    // 2. 从向量库查询 Memory
    const where = { apiKeyId: { in: apiKeyIds } };

    const [memories, total] = await Promise.all([
      this.vectorPrisma.memory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.vectorPrisma.memory.count({ where }),
    ]);

    // 3. 应用层组装 apiKeyName
    return {
      memories: memories.map((m) => ({
        id: m.id,
        apiKeyId: m.apiKeyId,
        userId: m.userId,
        agentId: m.agentId,
        sessionId: m.sessionId,
        content: m.content,
        metadata: asRecordOrNull(m.metadata),
        source: m.source,
        importance: m.importance,
        tags: m.tags,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        apiKeyName: this.resolveApiKeyName(m.apiKeyId, m.id, apiKeyNameMap),
      })),
      total,
    };
  }

  /**
   * 导出用户的 Memories（Console 用）
   * 跨库查询：主库查 ApiKey，向量库查 Memory
   */
  async exportByUser(
    userId: string,
    options: { apiKeyId?: string; format: 'json' | 'csv' } = { format: 'json' },
  ): Promise<{ data: string; contentType: string; filename: string }> {
    const { apiKeyId, format } = options;

    // 1. 从主库获取用户的 ApiKey 列表
    const apiKeys = await this.prisma.apiKey.findMany({
      where: apiKeyId ? { id: apiKeyId, userId } : { userId },
      select: { id: true, name: true },
    });

    const timestamp = new Date().toISOString().split('T')[0];

    if (apiKeys.length === 0) {
      if (format === 'csv') {
        return {
          data: 'id,userId,agentId,sessionId,content,source,importance,tags,apiKeyName,createdAt',
          contentType: 'text/csv',
          filename: `memories-export-${timestamp}.csv`,
        };
      }
      return {
        data: '[]',
        contentType: 'application/json',
        filename: `memories-export-${timestamp}.json`,
      };
    }

    const apiKeyIds = apiKeys.map((k) => k.id);
    const apiKeyNameMap = new Map(apiKeys.map((k) => [k.id, k.name]));

    // 2. 从向量库查询 Memory
    const memories = await this.vectorPrisma.memory.findMany({
      where: { apiKeyId: { in: apiKeyIds } },
      orderBy: { createdAt: 'desc' },
    });

    // 3. 应用层组装并导出
    if (format === 'csv') {
      const headers = [
        'id',
        'userId',
        'agentId',
        'sessionId',
        'content',
        'source',
        'importance',
        'tags',
        'apiKeyName',
        'createdAt',
      ];

      const rows = memories.map((m) => [
        escapeCsvField(m.id),
        escapeCsvField(m.userId),
        escapeCsvField(m.agentId),
        escapeCsvField(m.sessionId),
        escapeCsvField(m.content),
        escapeCsvField(m.source),
        escapeCsvField(m.importance?.toString()),
        escapeCsvField(m.tags.join(';')),
        escapeCsvField(this.resolveApiKeyName(m.apiKeyId, m.id, apiKeyNameMap)),
        escapeCsvField(m.createdAt.toISOString()),
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join(
        '\n',
      );

      return {
        data: csv,
        contentType: 'text/csv',
        filename: `memories-export-${timestamp}.csv`,
      };
    }

    // JSON 格式
    const jsonData = memories.map((m) => ({
      id: m.id,
      userId: m.userId,
      agentId: m.agentId,
      sessionId: m.sessionId,
      content: m.content,
      metadata: m.metadata,
      source: m.source,
      importance: m.importance,
      tags: m.tags,
      apiKeyName: this.resolveApiKeyName(m.apiKeyId, m.id, apiKeyNameMap),
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));

    return {
      data: JSON.stringify(jsonData, null, 2),
      contentType: 'application/json',
      filename: `memories-export-${timestamp}.json`,
    };
  }
}

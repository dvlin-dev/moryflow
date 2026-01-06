/**
 * [INPUT]: apiKeyId, CreateMemoryDto, SearchMemoryDto
 * [OUTPUT]: Memory, MemoryWithSimilarity[]
 * [POS]: Memory 业务逻辑层
 *
 * 职责：Memory 的 CRUD 和语义搜索
 */

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemoryRepository, Memory, MemoryWithSimilarity } from './memory.repository';
import { EmbeddingService } from '../embedding/embedding.service';
import { QuotaService } from '../quota/quota.service';
import { UsageService, UsageType } from '../usage/usage.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CreateMemoryDto, SearchMemoryDto } from './dto';

export interface MemoryWithApiKeyName extends Memory {
  apiKeyName: string;
}

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
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
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
    private readonly embeddingService: EmbeddingService,
    private readonly quotaService: QuotaService,
    private readonly usageService: UsageService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * 创建 Memory
   */
  async create(apiKeyId: string, dto: CreateMemoryDto): Promise<Memory> {
    // 检查配额
    const quotaCheck = await this.quotaService.checkMemoryQuota(apiKeyId);
    if (!quotaCheck.allowed) {
      throw new ForbiddenException(quotaCheck.reason);
    }

    // 生成向量
    const embeddingResult = await this.embeddingService.generateEmbedding(dto.content);

    // 创建 Memory
    const memory = await this.repository.createWithEmbedding(
      apiKeyId,
      {
        userId: dto.userId,
        agentId: dto.agentId,
        sessionId: dto.sessionId,
        content: dto.content,
        metadata: dto.metadata,
        source: dto.source,
        importance: dto.importance,
        tags: dto.tags ?? [],
      },
      embeddingResult.embedding,
    );

    // 记录用量 (Enterprise)
    const isEnterprise = await this.subscriptionService.isEnterpriseByApiKey(apiKeyId);
    if (isEnterprise) {
      await this.usageService.recordUsageByApiKey(apiKeyId, UsageType.MEMORY);
    }

    this.logger.log(`Created memory ${memory.id} for user ${dto.userId}`);
    return memory;
  }

  /**
   * 语义搜索 Memory
   */
  async search(apiKeyId: string, dto: SearchMemoryDto): Promise<MemoryWithSimilarity[]> {
    // 生成查询向量
    const embeddingResult = await this.embeddingService.generateEmbedding(dto.query);

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
  }

  /**
   * 列出用户的 Memory
   */
  async list(
    apiKeyId: string,
    userId: string,
    options: { limit?: number; offset?: number; agentId?: string; sessionId?: string } = {},
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
   */
  async listByUser(
    userId: string,
    options: ListMemoriesByUserOptions = {},
  ): Promise<{ memories: MemoryWithApiKeyName[]; total: number }> {
    const { apiKeyId, limit = 20, offset = 0 } = options;

    const where: Record<string, unknown> = {
      apiKey: { userId },
    };

    if (apiKeyId) {
      where.apiKeyId = apiKeyId;
    }

    const [memories, total] = await Promise.all([
      this.prisma.memory.findMany({
        where,
        include: {
          apiKey: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.memory.count({ where }),
    ]);

    return {
      memories: memories.map((m) => ({
        id: m.id,
        apiKeyId: m.apiKeyId,
        userId: m.userId,
        agentId: m.agentId,
        sessionId: m.sessionId,
        content: m.content,
        metadata: m.metadata as Record<string, unknown> | null,
        source: m.source,
        importance: m.importance,
        tags: m.tags,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        apiKeyName: m.apiKey.name,
      })),
      total,
    };
  }

  /**
   * 导出用户的 Memories（Console 用）
   */
  async exportByUser(
    userId: string,
    options: { apiKeyId?: string; format: 'json' | 'csv' } = { format: 'json' },
  ): Promise<{ data: string; contentType: string; filename: string }> {
    const { apiKeyId, format } = options;

    const where: Record<string, unknown> = {
      apiKey: { userId },
    };

    if (apiKeyId) {
      where.apiKeyId = apiKeyId;
    }

    const memories = await this.prisma.memory.findMany({
      where,
      include: {
        apiKey: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const timestamp = new Date().toISOString().split('T')[0];

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
        escapeCsvField(m.apiKey.name),
        escapeCsvField(m.createdAt.toISOString()),
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

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
      apiKeyName: m.apiKey.name,
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

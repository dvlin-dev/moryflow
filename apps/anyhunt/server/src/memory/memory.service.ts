/**
 * [INPUT]: platformUserId, apiKeyId, Mem0 V1 DTOs（含 JSON payload）
 * [OUTPUT]: Mem0 memory responses / search results / exports
 * [POS]: Memory 业务逻辑层（Mem0 V1 aligned）
 *
 * 职责：Memory CRUD、语义搜索、反馈（校验归属）、导出、图谱抽取与标签生成
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID, createHash } from 'crypto';
import { Prisma } from '../../generated/prisma-vector/client';
import { EmbeddingService } from '../embedding/embedding.service';
import { BillingService } from '../billing/billing.service';
import { VectorPrismaService } from '../vector-prisma/vector-prisma.service';
import { R2Service } from '../storage/r2.service';
import {
  MemoryRepository,
  type Memory,
  type MemoryWithSimilarity,
} from './memory.repository';
import type {
  CreateMemoryInput,
  SearchMemoryInput,
  ListMemoryQuery,
  DeleteMemoriesQuery,
  UpdateMemoryInput,
  BatchUpdateInput,
  BatchDeleteInput,
  FeedbackInput,
  ExportCreateInput,
  ExportGetInput,
} from './dto';
import { MemoryLlmService } from './services/memory-llm.service';
import {
  buildFilters,
  parseDate,
  parseKeywordList,
} from './filters/memory-filters.utils';
import { rerankMemories } from './utils/memory-search.utils';
import {
  applyFieldsFilter,
  toHistoryResponse,
  toMemoryResponse,
  toUpdateResponse,
  wrapOutputFormat,
} from './utils/memory-mappers.utils';
import {
  toInputJson,
  toJsonValue,
  toNullableInputJson,
} from './utils/memory-json.utils';
import {
  buildMemoryFromMessages,
  filterMessagesByPreferences,
} from './utils/memory-message.utils';

const DEFAULT_SIMILARITY_THRESHOLD = 0.3;
const EXPORT_VAULT_ID = 'memox-exports';
const ALLOWED_ENTITY_TYPES = new Set(['user', 'agent', 'app', 'run']);

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly repository: MemoryRepository,
    private readonly vectorPrisma: VectorPrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly billingService: BillingService,
    private readonly r2Service: R2Service,
    private readonly memoryLlmService: MemoryLlmService,
  ) {}

  private buildMemoryHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private resolveHistoryUserId(params: {
    userId?: string | null;
    agentId?: string | null;
    appId?: string | null;
    runId?: string | null;
  }): string {
    return (
      params.userId ||
      params.agentId ||
      params.appId ||
      params.runId ||
      'unknown'
    );
  }

  /**
   * 创建 Memory
   */
  async create(
    platformUserId: string,
    apiKeyId: string,
    dto: CreateMemoryInput,
  ): Promise<Record<string, unknown> | Record<string, unknown>[]> {
    if (dto.version && dto.version !== 'v1') {
      throw new BadRequestException('Only v1 is supported');
    }

    const billingKey = 'memox.memory.create' as const;
    const referenceId = randomUUID();
    const billing = await this.billingService.deductOrThrow({
      userId: platformUserId,
      billingKey,
      referenceId,
    });

    try {
      const filteredMessages = filterMessagesByPreferences(
        dto.messages,
        dto.includes,
        dto.excludes,
      );
      const fallbackText = buildMemoryFromMessages(filteredMessages);
      const rawMemoryTexts = dto.infer
        ? await this.memoryLlmService.inferMemoriesFromMessages({
            messages: filteredMessages,
            includes: dto.includes,
            excludes: dto.excludes,
            customInstructions: dto.custom_instructions,
            fallbackText,
          })
        : [fallbackText];
      const memoryTexts = rawMemoryTexts
        .map((memory) => memory.trim())
        .filter(Boolean);

      if (!memoryTexts.length) {
        throw new BadRequestException('Memory content is required');
      }

      const createOne = async (memoryText: string) => {
        const [embedding, tags] = await Promise.all([
          this.embeddingService.generateEmbedding(memoryText),
          this.memoryLlmService.extractTags({
            text: memoryText,
            customCategories: dto.custom_categories ?? null,
            customInstructions: dto.custom_instructions ?? null,
          }),
        ]);
        const graph = dto.enable_graph
          ? await this.memoryLlmService.extractGraph(memoryText)
          : null;

        const memory = await this.repository.createWithEmbedding(
          apiKeyId,
          {
            userId: dto.user_id ?? null,
            agentId: dto.agent_id ?? null,
            appId: dto.app_id ?? null,
            runId: dto.run_id ?? null,
            orgId: dto.org_id ?? null,
            projectId: dto.project_id ?? null,
            memory: memoryText,
            input: toJsonValue(filteredMessages),
            metadata: dto.metadata ? toJsonValue(dto.metadata) : null,
            categories: tags.categories,
            keywords: tags.keywords,
            hash: this.buildMemoryHash(memoryText),
            immutable: dto.immutable ?? false,
            expirationDate: parseDate(dto.expiration_date, 'expiration_date'),
            timestamp: dto.timestamp ? new Date(dto.timestamp * 1000) : null,
            entities: graph ? toJsonValue(graph.entities) : null,
            relations: graph ? toJsonValue(graph.relations) : null,
          },
          embedding.embedding,
        );

        await this.vectorPrisma.memoryHistory.create({
          data: {
            apiKeyId,
            memoryId: memory.id,
            userId: this.resolveHistoryUserId({
              userId: memory.userId ?? undefined,
              agentId: memory.agentId ?? undefined,
              appId: memory.appId ?? undefined,
              runId: memory.runId ?? undefined,
            }),
            input: toInputJson(filteredMessages),
            oldMemory: null,
            newMemory: memory.memory,
            event: 'ADD',
            metadata: dto.metadata ? toInputJson(dto.metadata) : Prisma.DbNull,
          },
        });

        return {
          id: memory.id,
          data: { memory: memory.memory },
          event: 'ADD',
        };
      };

      const shouldParallel = dto.async_mode ?? true;
      const responses = shouldParallel
        ? await Promise.all(memoryTexts.map((text) => createOne(text)))
        : [];

      if (!shouldParallel) {
        for (const memoryText of memoryTexts) {
          responses.push(await createOne(memoryText));
        }
      }

      return wrapOutputFormat(responses, dto.output_format);
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
   * 获取 Memory 列表
   */
  async list(
    apiKeyId: string,
    query: ListMemoryQuery,
  ): Promise<Record<string, unknown>[]> {
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 100;
    const skip = (page - 1) * pageSize;

    const filters = buildFilters({
      user_id: query.user_id,
      agent_id: query.agent_id,
      app_id: query.app_id,
      run_id: query.run_id,
      org_id: query.org_id,
      project_id: query.project_id,
      metadata: query.metadata ?? null,
      categories: query.categories ?? [],
      keywords: parseKeywordList(query.keywords),
      start_date: query.start_date,
      end_date: query.end_date,
      filters: query.filters,
    });

    const memories = await this.repository.listByFilters({
      apiKeyId,
      filters,
      limit: pageSize,
      offset: skip,
    });

    return memories.map((memory) =>
      applyFieldsFilter(toMemoryResponse(memory), query.fields),
    );
  }

  /**
   * 按过滤条件删除 Memory
   */
  async deleteByFilter(
    apiKeyId: string,
    query: DeleteMemoriesQuery,
  ): Promise<void> {
    const filters = buildFilters({
      user_id: query.user_id,
      agent_id: query.agent_id,
      app_id: query.app_id,
      run_id: query.run_id,
      org_id: query.org_id,
      project_id: query.project_id,
      metadata: query.metadata ?? null,
    });

    const memories = await this.repository.listByFilters({
      apiKeyId,
      filters,
    });

    if (memories.length === 0) {
      return;
    }

    const memoryIds = memories.map((memory) => memory.id);

    await this.vectorPrisma.memoryHistory.createMany({
      data: memories.map((memory) => ({
        apiKeyId,
        memoryId: memory.id,
        userId: this.resolveHistoryUserId({
          userId: memory.userId ?? undefined,
          agentId: memory.agentId ?? undefined,
          appId: memory.appId ?? undefined,
          runId: memory.runId ?? undefined,
        }),
        input: toNullableInputJson(memory.input),
        oldMemory: memory.memory,
        newMemory: memory.memory,
        event: 'DELETE',
        metadata: toNullableInputJson(memory.metadata),
      })),
    });

    await this.vectorPrisma.memoryFeedback.deleteMany({
      where: { apiKeyId, memoryId: { in: memoryIds } },
    });
    await this.vectorPrisma.memory.deleteMany({
      where: { apiKeyId, id: { in: memoryIds } },
    });
  }

  /**
   * 语义搜索 Memory
   */
  async search(
    platformUserId: string,
    apiKeyId: string,
    dto: SearchMemoryInput,
  ): Promise<Record<string, unknown> | Record<string, unknown>[]> {
    const billingKey = 'memox.memory.search' as const;
    const referenceId = randomUUID();
    const billing = await this.billingService.deductOrThrow({
      userId: platformUserId,
      billingKey,
      referenceId,
    });

    try {
      let memories: Memory[] | MemoryWithSimilarity[] = [];
      const applyExtendedFilters = Boolean(
        dto.filter_memories ||
        dto.only_metadata_based_search ||
        dto.metadata ||
        dto.categories?.length ||
        dto.filters,
      );

      const filters = buildFilters({
        user_id: dto.user_id,
        agent_id: dto.agent_id,
        app_id: dto.app_id,
        run_id: dto.run_id,
        org_id: dto.org_id,
        project_id: dto.project_id,
        metadata: applyExtendedFilters ? (dto.metadata ?? null) : null,
        categories: applyExtendedFilters ? (dto.categories ?? []) : [],
        filters: applyExtendedFilters ? dto.filters : undefined,
      });

      if (dto.only_metadata_based_search) {
        memories = await this.repository.listByFilters({
          apiKeyId,
          filters,
          limit: dto.top_k ?? 10,
          offset: 0,
        });
      } else if (dto.keyword_search) {
        memories = await this.repository.searchByKeyword({
          apiKeyId,
          query: dto.query,
          limit: dto.top_k ?? 10,
          filters,
        });
      } else {
        const embedding = await this.embeddingService.generateEmbedding(
          dto.query,
        );
        memories = await this.repository.searchSimilar({
          apiKeyId,
          embedding: embedding.embedding,
          limit: dto.top_k ?? 10,
          threshold: dto.threshold ?? DEFAULT_SIMILARITY_THRESHOLD,
          filters,
        });
      }

      if (dto.rerank) {
        memories = rerankMemories(dto.query, memories);
      }

      const results = memories.map((memory) =>
        applyFieldsFilter(toMemoryResponse(memory), dto.fields),
      );

      return wrapOutputFormat(results, dto.output_format);
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
   * 获取单个 Memory
   */
  async getById(
    apiKeyId: string,
    id: string,
  ): Promise<Record<string, unknown>> {
    const memory = await this.repository.findById(apiKeyId, id);
    if (!memory) {
      throw new NotFoundException('Memory not found');
    }

    return toMemoryResponse(memory);
  }

  /**
   * 更新 Memory
   */
  async update(
    apiKeyId: string,
    id: string,
    dto: UpdateMemoryInput,
  ): Promise<Record<string, unknown>> {
    const existing = await this.repository.findById(apiKeyId, id);
    if (!existing) {
      throw new NotFoundException('Memory not found');
    }

    if (existing.immutable) {
      throw new BadRequestException('Memory is immutable');
    }

    const [embedding, tags] = await Promise.all([
      this.embeddingService.generateEmbedding(dto.text),
      this.memoryLlmService.extractTags({
        text: dto.text,
        customCategories: null,
      }),
    ]);
    const hash = this.buildMemoryHash(dto.text);
    const updated = await this.repository.updateWithEmbedding(
      apiKeyId,
      id,
      {
        memory: dto.text,
        metadata: dto.metadata ? toJsonValue(dto.metadata) : null,
        categories: tags.categories,
        keywords: tags.keywords,
        hash,
      },
      embedding.embedding,
    );

    await this.vectorPrisma.memoryHistory.create({
      data: {
        apiKeyId,
        memoryId: id,
        userId: this.resolveHistoryUserId({
          userId: updated.userId ?? undefined,
          agentId: updated.agentId ?? undefined,
          appId: updated.appId ?? undefined,
          runId: updated.runId ?? undefined,
        }),
        input: toNullableInputJson(existing.input),
        oldMemory: existing.memory,
        newMemory: updated.memory,
        event: 'UPDATE',
        metadata: toNullableInputJson(
          dto.metadata ? toInputJson(dto.metadata) : existing.metadata,
        ),
      },
    });

    return toUpdateResponse(updated);
  }

  /**
   * 删除 Memory
   */
  async delete(apiKeyId: string, id: string): Promise<void> {
    const existing = await this.repository.findById(apiKeyId, id);
    if (!existing) {
      throw new NotFoundException('Memory not found');
    }

    if (existing.immutable) {
      throw new BadRequestException('Memory is immutable');
    }

    await this.vectorPrisma.memoryHistory.create({
      data: {
        apiKeyId,
        memoryId: id,
        userId: this.resolveHistoryUserId({
          userId: existing.userId ?? undefined,
          agentId: existing.agentId ?? undefined,
          appId: existing.appId ?? undefined,
          runId: existing.runId ?? undefined,
        }),
        input: toNullableInputJson(existing.input),
        oldMemory: existing.memory,
        newMemory: existing.memory,
        event: 'DELETE',
        metadata: toNullableInputJson(existing.metadata),
      },
    });

    await this.vectorPrisma.memoryFeedback.deleteMany({
      where: { apiKeyId, memoryId: id },
    });
    await this.repository.deleteById(apiKeyId, id);

    this.logger.log(`Deleted memory ${id}`);
  }

  /**
   * Memory History
   */
  async history(apiKeyId: string, memoryId: string): Promise<unknown[]> {
    const histories = await this.vectorPrisma.memoryHistory.findMany({
      where: { apiKeyId, memoryId },
      orderBy: { createdAt: 'desc' },
    });

    return histories.map((history) => toHistoryResponse(history));
  }

  /**
   * 按实体获取 Memory
   */
  async listByEntity(
    apiKeyId: string,
    entityType: string,
    entityId: string,
    query: ListMemoryQuery,
  ): Promise<Record<string, unknown>[]> {
    const normalizedType = entityType.endsWith('s')
      ? entityType.slice(0, -1)
      : entityType;
    if (!ALLOWED_ENTITY_TYPES.has(normalizedType)) {
      throw new BadRequestException('Unsupported entity type');
    }
    const mappedQuery: ListMemoryQuery = {
      ...query,
      user_id: normalizedType === 'user' ? entityId : query.user_id,
      agent_id: normalizedType === 'agent' ? entityId : query.agent_id,
      app_id: normalizedType === 'app' ? entityId : query.app_id,
      run_id: normalizedType === 'run' ? entityId : query.run_id,
    };

    return this.list(apiKeyId, mappedQuery);
  }

  /**
   * 批量更新 Memory
   */
  async batchUpdate(apiKeyId: string, dto: BatchUpdateInput) {
    const memoryIds = dto.memories.map((memory) => memory.memory_id);
    const existing = await this.vectorPrisma.memory.findMany({
      where: { apiKeyId, id: { in: memoryIds } },
    });

    if (existing.length !== memoryIds.length) {
      throw new NotFoundException('Memory not found');
    }

    for (const memory of existing) {
      if (memory.immutable) {
        throw new BadRequestException('Memory is immutable');
      }
    }

    const existingMap = new Map(existing.map((memory) => [memory.id, memory]));

    for (const update of dto.memories) {
      const [embedding, tags] = await Promise.all([
        this.embeddingService.generateEmbedding(update.text),
        this.memoryLlmService.extractTags({
          text: update.text,
          customCategories: null,
        }),
      ]);
      const hash = this.buildMemoryHash(update.text);
      const updated = await this.repository.updateWithEmbedding(
        apiKeyId,
        update.memory_id,
        {
          memory: update.text,
          categories: tags.categories,
          keywords: tags.keywords,
          hash,
        },
        embedding.embedding,
      );

      await this.vectorPrisma.memoryHistory.create({
        data: {
          apiKeyId,
          memoryId: updated.id,
          userId: this.resolveHistoryUserId({
            userId: updated.userId ?? undefined,
            agentId: updated.agentId ?? undefined,
            appId: updated.appId ?? undefined,
            runId: updated.runId ?? undefined,
          }),
          input: toNullableInputJson(updated.input),
          oldMemory: existingMap.get(updated.id)?.memory ?? updated.memory,
          newMemory: updated.memory,
          event: 'UPDATE',
          metadata: toNullableInputJson(updated.metadata),
        },
      });
    }

    return {
      message: `Successfully updated ${dto.memories.length} memories`,
    };
  }

  /**
   * 批量删除 Memory
   */
  async batchDelete(apiKeyId: string, dto: BatchDeleteInput) {
    const memories = await this.vectorPrisma.memory.findMany({
      where: { apiKeyId, id: { in: dto.memory_ids } },
      select: {
        id: true,
        memory: true,
        userId: true,
        agentId: true,
        appId: true,
        runId: true,
        immutable: true,
      },
    });

    if (memories.length !== dto.memory_ids.length) {
      throw new NotFoundException('Memory not found');
    }

    for (const memory of memories) {
      if (memory.immutable) {
        throw new BadRequestException('Memory is immutable');
      }
    }

    await this.vectorPrisma.memoryHistory.createMany({
      data: memories.map((memory) => ({
        apiKeyId,
        memoryId: memory.id,
        userId: this.resolveHistoryUserId({
          userId: memory.userId ?? undefined,
          agentId: memory.agentId ?? undefined,
          appId: memory.appId ?? undefined,
          runId: memory.runId ?? undefined,
        }),
        input: Prisma.DbNull,
        oldMemory: memory.memory,
        newMemory: memory.memory,
        event: 'DELETE',
        metadata: Prisma.DbNull,
      })),
    });

    await this.vectorPrisma.memoryFeedback.deleteMany({
      where: { apiKeyId, memoryId: { in: dto.memory_ids } },
    });
    await this.vectorPrisma.memory.deleteMany({
      where: { apiKeyId, id: { in: dto.memory_ids } },
    });

    return {
      message: `Successfully deleted ${dto.memory_ids.length} memories`,
    };
  }

  /**
   * 反馈
   */
  async feedback(apiKeyId: string, dto: FeedbackInput) {
    const memory = await this.repository.findById(apiKeyId, dto.memory_id);
    if (!memory) {
      throw new NotFoundException('Memory not found');
    }

    const record = await this.vectorPrisma.memoryFeedback.create({
      data: {
        apiKeyId,
        memoryId: dto.memory_id,
        feedback: dto.feedback ?? null,
        feedbackReason: dto.feedback_reason ?? null,
      },
    });

    return {
      id: record.id,
      feedback: record.feedback,
      feedback_reason: record.feedbackReason,
    };
  }

  /**
   * 导出（创建）
   */
  async createExport(apiKeyId: string, dto: ExportCreateInput) {
    const exportRecord = await this.vectorPrisma.memoryExport.create({
      data: {
        apiKeyId,
        schema: toInputJson(dto.schema),
        filters: dto.filters ? toInputJson(dto.filters) : Prisma.DbNull,
        orgId: dto.org_id ?? null,
        projectId: dto.project_id ?? null,
        status: 'PROCESSING',
      },
    });

    try {
      const exportData = await this.exportMemories(apiKeyId, {
        filters: dto.filters ?? {},
        org_id: dto.org_id ?? null,
        project_id: dto.project_id ?? null,
      });
      const payload = Buffer.from(JSON.stringify(exportData));

      await this.r2Service.uploadFile(
        apiKeyId,
        EXPORT_VAULT_ID,
        exportRecord.id,
        payload,
        'application/json',
        { filename: `memox-export-${exportRecord.id}.json` },
      );

      await this.vectorPrisma.memoryExport.update({
        where: { id: exportRecord.id },
        data: {
          status: 'COMPLETED',
          r2Key: exportRecord.id,
        },
      });
    } catch (error) {
      await this.vectorPrisma.memoryExport.update({
        where: { id: exportRecord.id },
        data: {
          status: 'FAILED',
          error: (error as Error).message,
        },
      });
      throw error;
    }

    return {
      message:
        'Memory export request received. The export will be ready in a few seconds.',
      id: exportRecord.id,
    };
  }

  /**
   * 导出（获取）
   */
  async getExport(apiKeyId: string, dto: ExportGetInput) {
    let exportRecord: { id: string; r2Key: string | null } | null = null;

    if (dto.memory_export_id) {
      exportRecord = await this.vectorPrisma.memoryExport.findFirst({
        where: { apiKeyId, id: dto.memory_export_id },
        select: { id: true, r2Key: true },
      });
    } else {
      if (!dto.filters) {
        throw new BadRequestException(
          'One of the filters: app_id, user_id, agent_id, run_id is required!',
        );
      }

      exportRecord = await this.vectorPrisma.memoryExport.findFirst({
        where: {
          apiKeyId,
          status: 'COMPLETED',
          ...(dto.filters ? { filters: dto.filters } : {}),
          orgId: dto.org_id ?? null,
          projectId: dto.project_id ?? null,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, r2Key: true },
      });
    }

    if (!exportRecord || !exportRecord.r2Key) {
      throw new NotFoundException('No memory export request found');
    }

    const content = await this.r2Service.downloadFile(
      apiKeyId,
      EXPORT_VAULT_ID,
      exportRecord.r2Key,
    );

    return JSON.parse(content.toString('utf-8')) as Record<string, unknown>;
  }

  private async exportMemories(
    apiKeyId: string,
    params: {
      filters?: Record<string, unknown>;
      org_id?: string | null;
      project_id?: string | null;
    },
  ): Promise<Record<string, unknown>> {
    const memories = await this.repository.listByFilters({
      apiKeyId,
      filters: buildFilters({
        filters: params.filters,
        org_id: params.org_id ?? undefined,
        project_id: params.project_id ?? undefined,
      }),
    });

    return {
      results: memories.map((memory) => toMemoryResponse(memory)),
    };
  }
}

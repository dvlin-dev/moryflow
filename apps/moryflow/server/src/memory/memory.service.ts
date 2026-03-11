import { randomUUID } from 'node:crypto';
import {
  BadGatewayException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { MemoxGatewayError } from '../memox';
import { MemoryClient } from './memory.client';
import type {
  AnyhuntMemoryDto,
  MemoryCreateExportInput,
  MemoryCreateExportResponseDto,
  MemoryCreateFactInput,
  MemoryEntityDetailQueryInput,
  MemoryEntityDetailResponseDto,
  MemoryFactDto,
  MemoryFeedbackInput,
  MemoryFeedbackResponseDto,
  MemoryGetExportInput,
  MemoryGetExportResponseDto,
  MemoryGraphQueryInput,
  MemoryGraphQueryResponseDto,
  MemoryHistoryResponseDto,
  MemoryListFactsInput,
  MemoryListFactsResponseDto,
  MemoryOverviewResponseDto,
  MemorySearchInput,
  MemorySearchResponseDto,
  MemoryUpdateFactInput,
  MemoryBatchUpdateFactsInput,
  MemoryBatchDeleteFactsInput,
} from './dto/memory.dto';

type ResolvedScope = {
  vaultId: string;
  projectId: string;
};

const UPSTREAM_PAGE_SIZE = 100;
const MAX_UPSTREAM_PAGES = 20;
const PASSTHROUGH_GATEWAY_STATUSES = new Set<number>([400, 404, 409, 422, 429]);

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryClient: MemoryClient,
  ) {}

  async getOverview(
    userId: string,
    query: { vaultId: string },
  ): Promise<MemoryOverviewResponseDto> {
    const scope = await this.resolveScope(userId, query.vaultId);
    const overview = await this.wrapGatewayError(() =>
      this.memoryClient.getOverview({
        userId,
        projectId: scope.projectId,
      }),
    );

    return {
      scope,
      indexing: {
        sourceCount: overview.indexing.source_count,
        indexedSourceCount: overview.indexing.indexed_source_count,
        pendingSourceCount: overview.indexing.pending_source_count,
        failedSourceCount: overview.indexing.failed_source_count,
        lastIndexedAt: overview.indexing.last_indexed_at,
      },
      facts: {
        manualCount: overview.facts.manual_count,
        derivedCount: overview.facts.derived_count,
      },
      graph: {
        entityCount: overview.graph.entity_count,
        relationCount: overview.graph.relation_count,
        projectionStatus: overview.graph.projection_status,
        lastProjectedAt: overview.graph.last_projected_at,
      },
    };
  }

  async search(
    userId: string,
    dto: MemorySearchInput,
  ): Promise<MemorySearchResponseDto> {
    const scope = await this.resolveScope(userId, dto.vaultId);
    const limitPerGroup = dto.limitPerGroup ?? 10;
    const response = await this.wrapGatewayError(() =>
      this.memoryClient.searchRetrieval({
        query: dto.query,
        includeGraphContext: dto.includeGraphContext ?? false,
        scope: {
          user_id: userId,
          project_id: scope.projectId,
        },
        group_limits: {
          sources: limitPerGroup,
          memory_facts: limitPerGroup,
        },
      }),
    );

    const hydratedFacts = await Promise.all(
      response.groups.facts.items.map(async (item) => {
        const detail = await this.getSearchFactDetail(item.memory_fact_id);
        if (!detail) {
          return null;
        }
        return { item, detail };
      }),
    );
    const availableFacts = hydratedFacts.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );

    return {
      scope,
      query: dto.query,
      groups: {
        files: {
          items: response.groups.files.items.map((item) => ({
            id: item.id,
            fileId: item.external_id ?? item.source_id,
            vaultId: item.project_id,
            sourceId: item.source_id,
            title: item.title,
            path: item.display_path,
            snippet: item.snippet,
            score: item.score,
          })),
          returnedCount: response.groups.files.returned_count,
          hasMore: response.groups.files.hasMore,
        },
        facts: {
          items: availableFacts.map(({ item, detail }) => {
            return {
              id: item.memory_fact_id,
              text: item.content,
              kind: this.toGatewayKind(detail.origin_kind),
              readOnly: Boolean(
                detail.immutable || detail.origin_kind === 'SOURCE_DERIVED',
              ),
              metadata: item.metadata,
              score: item.score,
              sourceId: detail.source_id ?? null,
            };
          }),
          returnedCount: availableFacts.length,
          hasMore: response.groups.facts.hasMore,
        },
      },
    };
  }

  async listFacts(
    userId: string,
    dto: MemoryListFactsInput,
  ): Promise<MemoryListFactsResponseDto> {
    const scope = await this.resolveScope(userId, dto.vaultId);
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;
    const kind = dto.kind ?? 'all';
    const skip = (page - 1) * pageSize;
    const targetCount = skip + pageSize + 1;
    const matched: MemoryFactDto[] = [];
    let reachedUpstreamPageLimit = false;

    for (
      let upstreamPage = 1;
      matched.length < targetCount && upstreamPage <= MAX_UPSTREAM_PAGES;
      upstreamPage += 1
    ) {
      const response = await this.wrapGatewayError(() =>
        this.memoryClient.listMemories({
          user_id: userId,
          project_id: scope.projectId,
          page: upstreamPage,
          page_size: UPSTREAM_PAGE_SIZE,
          ...(dto.query ? { keywords: dto.query } : {}),
          ...(dto.categories ? { categories: dto.categories } : {}),
        }),
      );

      matched.push(
        ...response
          .filter((item) => this.isMemoryInScope(item, userId, scope.projectId))
          .filter((item) => this.matchesKind(item, kind))
          .map((item) => this.toFactDto(item)),
      );

      if (response.length < UPSTREAM_PAGE_SIZE) {
        break;
      }

      if (upstreamPage === MAX_UPSTREAM_PAGES) {
        reachedUpstreamPageLimit = true;
      }
    }

    return {
      scope,
      page,
      pageSize,
      hasMore: reachedUpstreamPageLimit || matched.length > skip + pageSize,
      items: matched.slice(skip, skip + pageSize),
    };
  }

  async getFactDetail(
    userId: string,
    factId: string,
    query: { vaultId: string },
  ): Promise<MemoryFactDto> {
    const scope = await this.resolveScope(userId, query.vaultId);
    const memory = await this.getScopedMemory(userId, scope, factId);
    return this.toFactDto(memory);
  }

  async createFact(
    userId: string,
    dto: MemoryCreateFactInput,
  ): Promise<MemoryFactDto> {
    const scope = await this.resolveScope(userId, dto.vaultId);
    const created = await this.wrapGatewayError(() =>
      this.memoryClient.createMemory({
        messages: [{ role: 'user', content: dto.text }],
        infer: false,
        async_mode: false,
        idempotency_key: this.buildIdempotencyKey(
          'memory-create',
          userId,
          scope.projectId,
        ),
        user_id: userId,
        project_id: scope.projectId,
        ...(dto.metadata ? { metadata: dto.metadata } : {}),
        ...(dto.categories?.length
          ? {
              custom_categories: Object.fromEntries(
                dto.categories.map((category) => [category, true]),
              ),
            }
          : {}),
      }),
    );

    const first = created[0];
    if (!first) {
      throw new BadGatewayException({
        code: 'ANYHUNT_CREATE_EMPTY',
        message: 'Memory gateway returned an empty create response',
      });
    }

    const createdMemory = await this.getScopedMemory(userId, scope, first.id);
    return this.toFactDto(createdMemory);
  }

  async updateFact(
    userId: string,
    factId: string,
    dto: MemoryUpdateFactInput,
  ): Promise<MemoryFactDto> {
    const scope = await this.resolveScope(userId, dto.vaultId);
    const memory = await this.getScopedMemory(userId, scope, factId);
    this.assertWritable(memory);

    const updated = await this.wrapGatewayError(() =>
      this.memoryClient.updateMemory(factId, {
        text: dto.text,
        ...(dto.metadata ? { metadata: dto.metadata } : {}),
      }),
    );
    return this.toFactDto(updated);
  }

  async deleteFact(
    userId: string,
    factId: string,
    query: { vaultId: string },
  ): Promise<void> {
    const scope = await this.resolveScope(userId, query.vaultId);
    const memory = await this.getScopedMemory(userId, scope, factId);
    this.assertWritable(memory);

    await this.wrapGatewayError(() => this.memoryClient.deleteMemory(factId));
  }

  async batchUpdateFacts(
    userId: string,
    dto: MemoryBatchUpdateFactsInput,
  ): Promise<{ updatedCount: number }> {
    const scope = await this.resolveScope(userId, dto.vaultId);
    const memories = await Promise.all(
      dto.facts.map((item) => this.getScopedMemory(userId, scope, item.factId)),
    );
    memories.forEach((memory) => this.assertWritable(memory));

    await this.wrapGatewayError(() =>
      this.memoryClient.batchUpdateMemories({
        memories: dto.facts.map((item) => ({
          memory_id: item.factId,
          text: item.text,
        })),
      }),
    );
    return { updatedCount: dto.facts.length };
  }

  async batchDeleteFacts(
    userId: string,
    dto: MemoryBatchDeleteFactsInput,
  ): Promise<{ deletedCount: number }> {
    const scope = await this.resolveScope(userId, dto.vaultId);
    const memories = await Promise.all(
      dto.factIds.map((factId) => this.getScopedMemory(userId, scope, factId)),
    );
    memories.forEach((memory) => this.assertWritable(memory));

    await this.wrapGatewayError(() =>
      this.memoryClient.batchDeleteMemories({
        memory_ids: dto.factIds,
      }),
    );
    return { deletedCount: dto.factIds.length };
  }

  async getFactHistory(
    userId: string,
    factId: string,
    query: { vaultId: string },
  ): Promise<MemoryHistoryResponseDto> {
    const scope = await this.resolveScope(userId, query.vaultId);
    await this.getScopedMemory(userId, scope, factId);
    const history = await this.wrapGatewayError(() =>
      this.memoryClient.getMemoryHistory(factId),
    );

    return {
      scope,
      items: history.map((item) => ({
        id: item.id,
        factId: item.memory_id,
        event: item.event,
        oldText: item.old_content,
        newText: item.new_content,
        metadata: item.metadata ?? null,
        input: item.input ?? null,
        createdAt: item.created_at,
        userId: item.user_id ?? null,
      })),
    };
  }

  async feedbackFact(
    userId: string,
    dto: MemoryFeedbackInput,
  ): Promise<MemoryFeedbackResponseDto> {
    const scope = await this.resolveScope(userId, dto.vaultId);
    await this.getScopedMemory(userId, scope, dto.factId);
    const response = await this.wrapGatewayError(() =>
      this.memoryClient.feedbackMemory({
        memory_id: dto.factId,
        feedback: this.toAnyhuntFeedback(dto.feedback),
        ...(dto.reason ? { feedback_reason: dto.reason } : {}),
      }),
    );

    return {
      id: response.id,
      feedback: this.toGatewayFeedback(response.feedback),
      reason: response.feedback_reason ?? null,
    };
  }

  async queryGraph(
    userId: string,
    dto: MemoryGraphQueryInput,
  ): Promise<MemoryGraphQueryResponseDto> {
    const scope = await this.resolveScope(userId, dto.vaultId);
    const response = await this.wrapGatewayError(() =>
      this.memoryClient.queryGraph({
        ...(dto.query ? { query: dto.query } : {}),
        limit: dto.limit,
        ...(dto.entityTypes ? { entity_types: dto.entityTypes } : {}),
        ...(dto.relationTypes ? { relation_types: dto.relationTypes } : {}),
        scope: {
          user_id: userId,
          project_id: scope.projectId,
          ...(dto.metadata ? { metadata: dto.metadata } : {}),
        },
      }),
    );

    return {
      scope,
      entities: response.entities.map((entity) => ({
        id: entity.id,
        entityType: entity.entity_type,
        canonicalName: entity.canonical_name,
        aliases: entity.aliases,
        metadata: entity.metadata,
        lastSeenAt: entity.last_seen_at,
      })),
      relations: response.relations.map((relation) => ({
        id: relation.id,
        relationType: relation.relation_type,
        confidence: relation.confidence,
        from: {
          id: relation.from.id,
          entityType: relation.from.entity_type,
          canonicalName: relation.from.canonical_name,
          aliases: relation.from.aliases,
        },
        to: {
          id: relation.to.id,
          entityType: relation.to.entity_type,
          canonicalName: relation.to.canonical_name,
          aliases: relation.to.aliases,
        },
      })),
      evidenceSummary: {
        observationCount: response.evidence_summary.observation_count,
        sourceCount: response.evidence_summary.source_count,
        memoryFactCount: response.evidence_summary.memory_fact_count,
        latestObservedAt: response.evidence_summary.latest_observed_at,
      },
    };
  }

  async getEntityDetail(
    userId: string,
    entityId: string,
    query: MemoryEntityDetailQueryInput,
  ): Promise<MemoryEntityDetailResponseDto> {
    const scope = await this.resolveScope(userId, query.vaultId);
    const response = await this.wrapGatewayError(() =>
      this.memoryClient.getGraphEntityDetail(entityId, {
        user_id: userId,
        project_id: scope.projectId,
        ...(query.metadata ? { metadata: query.metadata } : {}),
      }),
    );

    return {
      entity: {
        id: response.entity.id,
        entityType: response.entity.entity_type,
        canonicalName: response.entity.canonical_name,
        aliases: response.entity.aliases,
        metadata: response.entity.metadata,
        lastSeenAt: response.entity.last_seen_at,
        incomingRelations: response.entity.incoming_relations.map((relation) =>
          this.toGraphRelation(relation),
        ),
        outgoingRelations: response.entity.outgoing_relations.map((relation) =>
          this.toGraphRelation(relation),
        ),
      },
      evidenceSummary: {
        observationCount: response.evidence_summary.observation_count,
        sourceCount: response.evidence_summary.source_count,
        memoryFactCount: response.evidence_summary.memory_fact_count,
        latestObservedAt: response.evidence_summary.latest_observed_at,
      },
      recentObservations: response.recent_observations.map((item) => ({
        id: item.id,
        observationType: item.observation_type,
        confidence: item.confidence,
        evidenceSourceId: item.evidence_source_id,
        evidenceRevisionId: item.evidence_revision_id,
        evidenceChunkId: item.evidence_chunk_id,
        evidenceMemoryId: item.evidence_memory_id,
        payload: item.payload,
        createdAt: item.created_at,
      })),
    };
  }

  async createExport(
    userId: string,
    dto: MemoryCreateExportInput,
  ): Promise<MemoryCreateExportResponseDto> {
    const scope = await this.resolveScope(userId, dto.vaultId);
    const response = await this.wrapGatewayError(() =>
      this.memoryClient.createExport({
        idempotency_key: this.buildIdempotencyKey(
          'memory-export',
          userId,
          scope.projectId,
        ),
        project_id: scope.projectId,
        filters: {
          user_id: userId,
        },
      }),
    );

    return {
      exportId: response.memory_export_id,
    };
  }

  async getExport(
    userId: string,
    dto: MemoryGetExportInput,
  ): Promise<MemoryGetExportResponseDto> {
    const scope = await this.resolveScope(userId, dto.vaultId);
    const response = await this.wrapGatewayError(() =>
      this.memoryClient.getExport({
        memory_export_id: dto.exportId,
        project_id: scope.projectId,
      }),
    );

    return {
      scope,
      items: response.results
        .filter((item) => this.isMemoryInScope(item, userId, scope.projectId))
        .map((item) => this.toFactDto(item)),
    };
  }

  private async resolveScope(
    userId: string,
    vaultId: string,
  ): Promise<ResolvedScope> {
    const vault = await this.prisma.vault.findUnique({
      where: { id: vaultId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!vault || vault.userId !== userId) {
      throw new NotFoundException('Vault not found');
    }

    return {
      vaultId: vault.id,
      projectId: vault.id,
    };
  }

  private async getScopedMemory(
    userId: string,
    scope: ResolvedScope,
    factId: string,
  ): Promise<AnyhuntMemoryDto> {
    const memory = await this.wrapGatewayError(() =>
      this.memoryClient.getMemoryById(factId),
    );

    if (!this.isMemoryInScope(memory, userId, scope.projectId)) {
      throw new NotFoundException('Fact not found');
    }

    return memory;
  }

  private async getSearchFactDetail(
    factId: string,
  ): Promise<AnyhuntMemoryDto | null> {
    // Retrieval already produced the ranked result set. Fact detail lookup only
    // enriches the response, so one stale or noisy upstream record must not fail
    // the entire search payload.
    try {
      return await this.memoryClient.getMemoryById(factId);
    } catch (error) {
      if (error instanceof MemoxGatewayError) {
        if (error.status !== 404 && error.status !== 409) {
          this.logger.warn(
            `Skipped memory search hydration for fact ${factId}: upstream status ${error.status}${error.code ? ` (${error.code})` : ''}`,
          );
        }
        return null;
      }

      this.logger.warn(
        `Skipped memory search hydration for fact ${factId}: unexpected detail error`,
      );
      return null;
    }
  }

  private isMemoryInScope(
    memory: AnyhuntMemoryDto,
    userId: string,
    projectId: string,
  ): boolean {
    if (memory.project_id !== projectId) {
      return false;
    }
    if (memory.user_id && memory.user_id !== userId) {
      return false;
    }
    return true;
  }

  private matchesKind(
    memory: AnyhuntMemoryDto,
    kind: 'all' | 'manual' | 'derived',
  ): boolean {
    if (kind === 'all') return true;
    if (kind === 'manual') return memory.origin_kind === 'MANUAL';
    return memory.origin_kind === 'SOURCE_DERIVED';
  }

  private assertWritable(memory: AnyhuntMemoryDto): void {
    if (memory.immutable || memory.origin_kind === 'SOURCE_DERIVED') {
      throw new ConflictException({
        code: 'FACT_READ_ONLY',
        message: 'Derived facts are read-only',
      });
    }
  }

  private toFactDto(memory: AnyhuntMemoryDto): MemoryFactDto {
    return {
      id: memory.id,
      text: memory.content,
      kind: this.toGatewayKind(memory.origin_kind),
      readOnly: memory.immutable || memory.origin_kind === 'SOURCE_DERIVED',
      metadata: memory.metadata,
      categories: memory.categories ?? [],
      sourceId: memory.source_id,
      sourceRevisionId: memory.source_revision_id,
      derivedKey: memory.derived_key,
      expirationDate: memory.expiration_date,
      createdAt: memory.created_at,
      updatedAt: memory.updated_at,
    };
  }

  private toGatewayKind(
    kind: 'MANUAL' | 'SOURCE_DERIVED',
  ): 'manual' | 'source-derived' {
    return kind === 'MANUAL' ? 'manual' : 'source-derived';
  }

  private toAnyhuntFeedback(
    feedback: 'positive' | 'negative' | 'very_negative',
  ): 'POSITIVE' | 'NEGATIVE' | 'VERY_NEGATIVE' {
    if (feedback === 'positive') return 'POSITIVE';
    if (feedback === 'negative') return 'NEGATIVE';
    return 'VERY_NEGATIVE';
  }

  private toGatewayFeedback(
    feedback: 'POSITIVE' | 'NEGATIVE' | 'VERY_NEGATIVE' | null,
  ): 'positive' | 'negative' | 'very_negative' | null {
    if (feedback === null) return null;
    if (feedback === 'NEGATIVE') return 'negative';
    if (feedback === 'VERY_NEGATIVE') return 'very_negative';
    return 'positive';
  }

  private toGraphRelation(relation: {
    id: string;
    relation_type: string;
    confidence: number;
    from: {
      id: string;
      entity_type: string;
      canonical_name: string;
      aliases: string[];
    };
    to: {
      id: string;
      entity_type: string;
      canonical_name: string;
      aliases: string[];
    };
  }) {
    return {
      id: relation.id,
      relationType: relation.relation_type,
      confidence: relation.confidence,
      from: {
        id: relation.from.id,
        entityType: relation.from.entity_type,
        canonicalName: relation.from.canonical_name,
        aliases: relation.from.aliases,
      },
      to: {
        id: relation.to.id,
        entityType: relation.to.entity_type,
        canonicalName: relation.to.canonical_name,
        aliases: relation.to.aliases,
      },
    };
  }

  private buildIdempotencyKey(
    prefix: string,
    userId: string,
    projectId: string,
  ): string {
    return `${prefix}:${userId}:${projectId}:${randomUUID()}`;
  }

  private async wrapGatewayError<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof MemoxGatewayError) {
        throw this.toGatewayHttpException(error);
      }

      throw error;
    }
  }

  private toGatewayHttpException(error: MemoxGatewayError): HttpException {
    if (PASSTHROUGH_GATEWAY_STATUSES.has(error.status)) {
      return new HttpException(
        {
          code: error.code ?? 'ANYHUNT_REQUEST_FAILED',
          message: error.message,
          details: error.details,
        },
        error.status,
      );
    }

    return new BadGatewayException({
      code: 'ANYHUNT_GATEWAY_ERROR',
      message: 'Memory gateway upstream request failed',
      details: {
        upstreamStatus: error.status,
        upstreamCode: error.code ?? null,
        upstreamRequestId: error.requestId ?? null,
      },
    });
  }
}

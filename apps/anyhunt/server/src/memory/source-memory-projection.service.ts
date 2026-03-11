import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { createHash } from 'node:crypto';
import type { Queue } from 'bullmq';
import { EmbeddingService } from '../embedding';
import {
  MEMOX_GRAPH_PROJECTION_QUEUE,
  type MemoxGraphProjectionJobData,
} from '../queue';
import { SourceStorageService } from '../sources/source-storage.service';
import { VectorPrismaService } from '../vector-prisma';
import { MemoryRepository } from './memory.repository';
import { MemoryLlmService } from './services/memory-llm.service';
import type {
  SourceMemoryProjectionJobPayload,
  SourceMemoryProjectionResult,
} from './source-memory-projection.types';
import { toJsonValue } from './utils/memory-json.utils';

@Injectable()
export class SourceMemoryProjectionService {
  private readonly logger = new Logger(SourceMemoryProjectionService.name);
  private static readonly MAX_FACTS_PER_SOURCE = 24;

  constructor(
    private readonly vectorPrisma: VectorPrismaService,
    private readonly memoryRepository: MemoryRepository,
    private readonly memoryLlmService: MemoryLlmService,
    private readonly embeddingService: EmbeddingService,
    private readonly sourceStorageService: SourceStorageService,
    @InjectQueue(MEMOX_GRAPH_PROJECTION_QUEUE)
    private readonly graphProjectionQueue: Queue<MemoxGraphProjectionJobData>,
  ) {}

  async processJob(
    payload: SourceMemoryProjectionJobPayload,
  ): Promise<SourceMemoryProjectionResult> {
    const source = await this.vectorPrisma.knowledgeSource.findFirst({
      where: {
        apiKeyId: payload.apiKeyId,
        id: payload.sourceId,
        currentRevisionId: payload.revisionId,
        status: 'ACTIVE',
      },
    });

    if (!source) {
      return {
        status: 'SKIPPED',
        sourceId: payload.sourceId,
        revisionId: payload.revisionId,
        upsertedCount: 0,
        deletedCount: 0,
      };
    }

    const revision = await this.vectorPrisma.knowledgeSourceRevision.findFirst({
      where: {
        apiKeyId: payload.apiKeyId,
        id: payload.revisionId,
        sourceId: payload.sourceId,
      },
    });

    if (!revision?.normalizedTextR2Key) {
      return {
        status: 'SKIPPED',
        sourceId: payload.sourceId,
        revisionId: payload.revisionId,
        upsertedCount: 0,
        deletedCount: 0,
      };
    }

    const normalizedText = await this.sourceStorageService.downloadText(
      revision.normalizedTextR2Key,
    );
    const extractedFacts =
      await this.memoryLlmService.extractFactsFromText(normalizedText);
    const facts = this.normalizeFacts(extractedFacts);

    const existingFacts = await this.vectorPrisma.memoryFact.findMany({
      where: {
        apiKeyId: payload.apiKeyId,
        sourceId: payload.sourceId,
        originKind: 'SOURCE_DERIVED',
      },
    });
    const existingByKey = new Map(
      existingFacts
        .filter((fact) => fact.derivedKey)
        .map((fact) => [fact.derivedKey as string, fact]),
    );

    const desiredKeys = facts.map((fact) => this.buildDerivedKey(fact));
    const staleFactIds = existingFacts
      .filter(
        (fact) => !fact.derivedKey || !desiredKeys.includes(fact.derivedKey),
      )
      .map((fact) => fact.id);

    const tags = await Promise.all(
      facts.map((fact) =>
        this.memoryLlmService.extractTags({
          text: fact,
          customCategories: null,
          customInstructions: null,
        }),
      ),
    );
    const embeddings =
      await this.embeddingService.generateBatchEmbeddings(facts);

    const upsertedIds = await this.vectorPrisma.$transaction(async (tx) => {
      const ids: string[] = [];
      const sourceMetadata =
        source.metadata &&
        typeof source.metadata === 'object' &&
        !Array.isArray(source.metadata)
          ? (source.metadata as Record<string, unknown>)
          : null;

      for (const [index, fact] of facts.entries()) {
        const derivedKey = desiredKeys[index];
        const existing = existingByKey.get(derivedKey);
        const data = {
          userId: source.userId,
          agentId: source.agentId,
          appId: source.appId,
          runId: source.runId,
          orgId: source.orgId,
          projectId: source.projectId,
          content: fact,
          input: null,
          metadata: toJsonValue({
            ...(sourceMetadata ?? {}),
            source_title: source.title,
            source_display_path: source.displayPath,
            projection_kind: 'source_memory_fact',
          }),
          categories: tags[index]?.categories ?? [],
          keywords: tags[index]?.keywords ?? [],
          hash: this.buildHash(fact),
          immutable: true,
          graphEnabled: true,
          expirationDate: null,
          timestamp: null,
          originKind: 'SOURCE_DERIVED' as const,
          sourceId: payload.sourceId,
          sourceRevisionId: payload.revisionId,
          derivedKey,
        };

        const record = existing
          ? await this.memoryRepository.updateWithEmbedding(
              payload.apiKeyId,
              existing.id,
              data,
              embeddings[index].embedding,
              tx,
            )
          : await this.memoryRepository.createWithEmbedding(
              payload.apiKeyId,
              data,
              embeddings[index].embedding,
              tx,
            );

        ids.push(record.id);
      }

      if (staleFactIds.length > 0) {
        await tx.memoryFactFeedback.deleteMany({
          where: { apiKeyId: payload.apiKeyId, memoryId: { in: staleFactIds } },
        });
        await tx.memoryFact.deleteMany({
          where: { apiKeyId: payload.apiKeyId, id: { in: staleFactIds } },
        });
      }

      return ids;
    });

    await Promise.all([
      ...upsertedIds.map((memoryId) =>
        this.graphProjectionQueue.add(
          'project-memory-fact',
          {
            kind: 'project_memory_fact',
            apiKeyId: payload.apiKeyId,
            memoryId,
          },
          {
            jobId: `memox-graph:memory:${payload.apiKeyId}:${memoryId}`,
          },
        ),
      ),
      ...staleFactIds.map((memoryId) =>
        this.graphProjectionQueue.add(
          'cleanup-memory-fact',
          {
            kind: 'cleanup_memory_fact',
            apiKeyId: payload.apiKeyId,
            memoryId,
          },
          {
            jobId: `memox-graph:cleanup-memory:${payload.apiKeyId}:${memoryId}`,
          },
        ),
      ),
    ]);

    this.logger.log(
      `Projected ${upsertedIds.length} memory facts from source ${payload.sourceId}@${payload.revisionId}`,
    );

    return {
      status: 'PROJECTED',
      sourceId: payload.sourceId,
      revisionId: payload.revisionId,
      upsertedCount: upsertedIds.length,
      deletedCount: staleFactIds.length,
    };
  }

  private normalizeFacts(facts: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const fact of facts) {
      const normalized = fact.trim().replace(/\s+/g, ' ');
      if (!normalized) {
        continue;
      }
      const key = normalized.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(normalized);
      if (result.length >= SourceMemoryProjectionService.MAX_FACTS_PER_SOURCE) {
        break;
      }
    }

    return result;
  }

  private buildDerivedKey(content: string): string {
    return `source_fact:${this.buildHash(content)}`;
  }

  private buildHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}

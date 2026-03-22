/**
 * [INPUT]: apiKeyId + revision-scoped chunk payloads
 * [OUTPUT]: SourceChunk records / replace operations
 * [POS]: Sources 检索 chunk 仓储
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  type Prisma,
  type SourceChunk as PrismaSourceChunk,
} from '../../generated/prisma-vector/client';
import { VectorPgService, VectorPrismaService } from '../vector-prisma';
import { BaseRepository } from '../common/base.repository';
import type { SourceChunkDraft, SourceScope } from './sources.types';

export type SourceChunkRecord = PrismaSourceChunk;

interface ReplaceRevisionChunksParams extends SourceScope {
  apiKeyId: string;
  sourceId: string;
  revisionId: string;
  chunks: Array<
    SourceChunkDraft & {
      embedding: number[];
      metadata?: Prisma.InputJsonValue | null;
    }
  >;
}

@Injectable()
export class SourceChunkRepository extends BaseRepository<SourceChunkRecord> {
  private static readonly INSERT_BATCH_SIZE = 100;

  constructor(
    private readonly vectorPrisma: VectorPrismaService,
    private readonly vectorPg: VectorPgService,
  ) {
    super(vectorPrisma, vectorPrisma.sourceChunk);
  }

  async replaceRevisionChunks(
    params: ReplaceRevisionChunksParams,
  ): Promise<void> {
    const {
      apiKeyId,
      sourceId,
      revisionId,
      userId,
      agentId,
      appId,
      runId,
      orgId,
      projectId,
      chunks,
    } = params;

    await this.vectorPg.withTransaction(async (client) => {
      await client.query(
        'DELETE FROM "SourceChunk" WHERE "apiKeyId" = $1 AND "revisionId" = $2',
        [apiKeyId, revisionId],
      );

      for (
        let offset = 0;
        offset < chunks.length;
        offset += SourceChunkRepository.INSERT_BATCH_SIZE
      ) {
        const batch = chunks.slice(
          offset,
          offset + SourceChunkRepository.INSERT_BATCH_SIZE,
        );
        const { text, values } = this.buildInsertBatchQuery({
          apiKeyId,
          sourceId,
          revisionId,
          userId,
          agentId,
          appId,
          runId,
          orgId,
          projectId,
          chunkCount: chunks.length,
          offset,
          batch,
        });
        await client.query(text, values);
      }
    });
  }

  private buildInsertBatchQuery(params: {
    apiKeyId: string;
    sourceId: string;
    revisionId: string;
    userId: string | null | undefined;
    agentId: string | null | undefined;
    appId: string | null | undefined;
    runId: string | null | undefined;
    orgId: string | null | undefined;
    projectId: string | null | undefined;
    chunkCount: number;
    offset: number;
    batch: ReplaceRevisionChunksParams['chunks'];
  }): {
    text: string;
    values: unknown[];
  } {
    const values: unknown[] = [];
    const rows: string[] = [];

    for (const [index, chunk] of params.batch.entries()) {
      const base = values.length;
      rows.push(`(
        $${base + 1},
        $${base + 2},
        $${base + 3},
        $${base + 4},
        $${base + 5},
        $${base + 6},
        $${base + 7},
        $${base + 8},
        $${base + 9},
        $${base + 10},
        $${base + 11},
        $${base + 12},
        $${base + 13}::text[],
        $${base + 14},
        $${base + 15},
        $${base + 16}::jsonb,
        $${base + 17}::text[],
        $${base + 18}::vector,
        NOW(),
        NOW()
      )`);
      values.push(
        randomUUID(),
        params.apiKeyId,
        params.sourceId,
        params.revisionId,
        params.userId ?? null,
        params.agentId ?? null,
        params.appId ?? null,
        params.runId ?? null,
        params.orgId ?? null,
        params.projectId ?? null,
        params.offset + index,
        params.chunkCount,
        chunk.headingPath,
        chunk.content,
        chunk.tokenCount,
        chunk.metadata === undefined ? null : JSON.stringify(chunk.metadata),
        chunk.keywords,
        this.serializeEmbedding(chunk.embedding),
      );
    }

    return {
      text: `
        INSERT INTO "SourceChunk" (
          "id",
          "apiKeyId",
          "sourceId",
          "revisionId",
          "userId",
          "agentId",
          "appId",
          "runId",
          "orgId",
          "projectId",
          "chunkIndex",
          "chunkCount",
          "headingPath",
          "content",
          "tokenCount",
          "metadata",
          "keywords",
          "embedding",
          "createdAt",
          "updatedAt"
        ) VALUES ${rows.join(',\n')}
      `,
      values,
    };
  }

  private serializeEmbedding(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }
}

/**
 * [INPUT]: apiKeyId + revision-scoped chunk payloads
 * [OUTPUT]: SourceChunk records / replace operations
 * [POS]: Sources 检索 chunk 仓储
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  Prisma,
  type SourceChunk as PrismaSourceChunk,
} from '../../generated/prisma-vector/client';
import { VectorPrismaService } from '../vector-prisma';
import { BaseRepository } from '../common/base.repository';
import type { SourceChunkDraft, SourceScope } from './sources.types';

export type SourceChunkRecord = PrismaSourceChunk;

function toSqlJson(
  value: Prisma.InputJsonValue | Prisma.JsonValue | null | undefined,
): Prisma.Sql {
  if (value === undefined || value === null) {
    return Prisma.sql`NULL`;
  }

  return Prisma.sql`${JSON.stringify(value)}::json`;
}

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
  constructor(private readonly vectorPrisma: VectorPrismaService) {
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

    await this.vectorPrisma.$transaction(async (tx) => {
      await tx.sourceChunk.deleteMany({
        where: {
          apiKeyId,
          revisionId,
        },
      });

      for (const [index, chunk] of chunks.entries()) {
        const embedding = `[${chunk.embedding.join(',')}]`;
        await tx.$executeRaw(Prisma.sql`
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
          ) VALUES (
            ${randomUUID()},
            ${apiKeyId},
            ${sourceId},
            ${revisionId},
            ${userId ?? null},
            ${agentId ?? null},
            ${appId ?? null},
            ${runId ?? null},
            ${orgId ?? null},
            ${projectId ?? null},
            ${index},
            ${chunks.length},
            ${chunk.headingPath},
            ${chunk.content},
            ${chunk.tokenCount},
            ${toSqlJson(chunk.metadata)},
            ${chunk.keywords},
            ${embedding}::vector,
            NOW(),
            NOW()
          )
        `);
      }
    });
  }
}

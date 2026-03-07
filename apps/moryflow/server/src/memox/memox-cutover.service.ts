/**
 * [INPUT]: backfill/replay/shadow compare 执行参数
 * [OUTPUT]: cutover checkpoint、回放统计与 drift report
 * [POS]: Memox 二期切流控制面服务
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { RedisService } from '../redis';
import { MemoxOutboxConsumerService } from './memox-outbox-consumer.service';
import { MemoxFileProjectionService } from './memox-file-projection.service';
import { MemoxSearchAdapterService } from './memox-search-adapter.service';
import {
  LegacyVectorSearchClient,
  type LegacyVectorSearchMatch,
} from './legacy-vector-search.client';

const MEMOX_PHASE2_BACKFILL_STATE_KEY = 'memox:phase2:backfill-state';
const DEFAULT_REPLAY_CONSUMER_ID = 'memox-phase2-replay';

export interface MemoxBackfillCursor {
  fileId: string;
  updatedAt: string;
}

export interface MemoxBackfillState {
  processedCount: number;
  cursor: MemoxBackfillCursor | null;
  status: 'running' | 'completed';
}

export interface MemoxBackfillBatchOptions {
  batchSize: number;
  reset?: boolean;
}

export interface MemoxBackfillBatchResult {
  scanned: number;
  processed: number;
  done: boolean;
  nextCursor: MemoxBackfillCursor | null;
}

export interface MemoxReplayOutboxOptions {
  batchSize: number;
  maxBatches: number;
  leaseMs: number;
  consumerId?: string;
}

export interface MemoxReplayOutboxResult {
  batches: number;
  claimed: number;
  acknowledged: number;
  failedIds: string[];
  deadLetteredIds: string[];
  drained: boolean;
}

export interface MemoxShadowCompareQuery {
  query: string;
  vaultId?: string;
  expectedFileIds?: string[];
}

export interface MemoxShadowCompareParams {
  userId: string;
  topK: number;
  queries: MemoxShadowCompareQuery[];
}

export interface MemoxShadowCompareQueryReport {
  query: string;
  vaultId: string | null;
  legacyFileIds: string[];
  memoxFileIds: string[];
  expectedFileIds: string[];
  expectedHit: boolean;
  deletedLeaks: string[];
  pathMismatches: string[];
}

export interface MemoxShadowCompareReport {
  totalQueries: number;
  expectedHitRate: number;
  deletedLeakCount: number;
  pathMismatchCount: number;
  queries: MemoxShadowCompareQueryReport[];
}

interface LiveSyncFileRecord {
  id: string;
  title: string;
  path: string;
  vaultId: string;
  isDeleted: boolean;
}

@Injectable()
export class MemoxCutoverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly memoxOutboxConsumerService: MemoxOutboxConsumerService,
    private readonly memoxFileProjectionService: MemoxFileProjectionService,
    private readonly memoxSearchAdapterService: MemoxSearchAdapterService,
    private readonly legacyVectorSearchClient: LegacyVectorSearchClient,
  ) {}

  async backfillBatch(
    options: MemoxBackfillBatchOptions,
  ): Promise<MemoxBackfillBatchResult> {
    if (options.reset) {
      await this.redisService.del(MEMOX_PHASE2_BACKFILL_STATE_KEY);
    }

    const previousState = options.reset ? null : await this.readBackfillState();
    const cursor = previousState?.cursor ?? null;
    const files = await this.prisma.syncFile.findMany({
      where: {
        isDeleted: false,
        ...(cursor
          ? {
              OR: [
                { updatedAt: { gt: new Date(cursor.updatedAt) } },
                {
                  updatedAt: new Date(cursor.updatedAt),
                  id: { gt: cursor.fileId },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: options.batchSize,
      select: {
        id: true,
        vaultId: true,
        path: true,
        title: true,
        contentHash: true,
        storageRevision: true,
        updatedAt: true,
        vault: {
          select: {
            userId: true,
          },
        },
      },
    });

    for (const file of files) {
      await this.memoxFileProjectionService.upsertFile({
        eventId: `memox-backfill:${file.id}:${file.storageRevision}:upsert`,
        userId: file.vault.userId,
        vaultId: file.vaultId,
        fileId: file.id,
        path: file.path,
        title: file.title,
        contentHash: file.contentHash,
        storageRevision: file.storageRevision,
        previousContentHash: null,
        previousStorageRevision: null,
      });
    }

    const lastFile = files.at(-1) ?? null;
    const nextCursor = lastFile
      ? {
          fileId: lastFile.id,
          updatedAt: lastFile.updatedAt.toISOString(),
        }
      : cursor;
    const processedCount = (previousState?.processedCount ?? 0) + files.length;
    const done = files.length < options.batchSize;

    await this.redisService.set(
      MEMOX_PHASE2_BACKFILL_STATE_KEY,
      JSON.stringify({
        processedCount,
        cursor: nextCursor,
        status: done ? 'completed' : 'running',
      } satisfies MemoxBackfillState),
    );

    return {
      scanned: files.length,
      processed: files.length,
      done,
      nextCursor,
    };
  }

  async replayOutbox(
    options: MemoxReplayOutboxOptions,
  ): Promise<MemoxReplayOutboxResult> {
    const failedIds = new Set<string>();
    const deadLetteredIds = new Set<string>();
    let batches = 0;
    let claimed = 0;
    let acknowledged = 0;
    let drained = false;

    while (batches < options.maxBatches) {
      batches += 1;
      const batch = await this.memoxOutboxConsumerService.processBatch({
        consumerId: options.consumerId ?? DEFAULT_REPLAY_CONSUMER_ID,
        limit: options.batchSize,
        leaseMs: options.leaseMs,
      });
      claimed += batch.claimed;
      acknowledged += batch.acknowledged;
      batch.failedIds.forEach((id) => failedIds.add(id));
      batch.deadLetteredIds.forEach((id) => deadLetteredIds.add(id));

      if (batch.claimed === 0) {
        break;
      }
    }

    const remaining = await this.prisma.fileLifecycleOutbox.count({
      where: {
        processedAt: null,
      },
    });
    drained =
      failedIds.size === 0 && deadLetteredIds.size === 0 && remaining === 0;

    return {
      batches,
      claimed,
      acknowledged,
      failedIds: [...failedIds],
      deadLetteredIds: [...deadLetteredIds],
      drained,
    };
  }

  async shadowCompare(
    params: MemoxShadowCompareParams,
  ): Promise<MemoxShadowCompareReport> {
    const reports: MemoxShadowCompareQueryReport[] = [];
    let expectedHitCount = 0;
    let deletedLeakCount = 0;
    let pathMismatchCount = 0;

    for (const querySpec of params.queries) {
      const legacyMatches = await this.legacyVectorSearchClient.query(
        params.userId,
        querySpec.query,
        {
          topK: params.topK,
          namespace: `user:${params.userId}`,
          ...(querySpec.vaultId
            ? {
                filter: {
                  vaultId: querySpec.vaultId,
                },
              }
            : {}),
        },
      );
      const legacyLiveMap = await this.loadLiveFileMap(
        params.userId,
        legacyMatches,
        querySpec.vaultId,
      );
      const legacyFileIds = legacyMatches
        .filter((match) => legacyLiveMap.has(match.id))
        .map((match) => match.id);

      const memoxResult = await this.memoxSearchAdapterService.searchFiles({
        userId: params.userId,
        query: querySpec.query,
        topK: params.topK,
        ...(querySpec.vaultId ? { vaultId: querySpec.vaultId } : {}),
      });
      const memoxFileIds = memoxResult.results.map((item) => item.fileId);
      const memoxLiveMap = await this.loadLiveFileMap(
        params.userId,
        memoxResult.results.map((item) => ({
          id: item.fileId,
          score: item.score,
        })),
        querySpec.vaultId,
      );

      const deletedLeaks = memoxFileIds.filter(
        (fileId) => !memoxLiveMap.has(fileId),
      );
      const pathMismatches = memoxResult.results
        .filter((item) => {
          const liveFile = memoxLiveMap.get(item.fileId);
          if (!liveFile) {
            return false;
          }
          return (
            liveFile.path !== item.path || liveFile.vaultId !== item.vaultId
          );
        })
        .map((item) => item.fileId);
      const expectedFileIds = querySpec.expectedFileIds ?? [];
      const expectedHit =
        expectedFileIds.length === 0
          ? true
          : expectedFileIds.every((fileId) => memoxFileIds.includes(fileId));

      if (expectedHit) {
        expectedHitCount += 1;
      }
      deletedLeakCount += deletedLeaks.length;
      pathMismatchCount += pathMismatches.length;

      reports.push({
        query: querySpec.query,
        vaultId: querySpec.vaultId ?? null,
        legacyFileIds,
        memoxFileIds,
        expectedFileIds,
        expectedHit,
        deletedLeaks,
        pathMismatches,
      });
    }

    return {
      totalQueries: reports.length,
      expectedHitRate:
        reports.length === 0 ? 1 : expectedHitCount / reports.length,
      deletedLeakCount,
      pathMismatchCount,
      queries: reports,
    };
  }

  private async readBackfillState(): Promise<MemoxBackfillState | null> {
    const raw = await this.redisService.get(MEMOX_PHASE2_BACKFILL_STATE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as MemoxBackfillState;
  }

  private async loadLiveFileMap(
    userId: string,
    matches: Array<Pick<LegacyVectorSearchMatch, 'id'>>,
    vaultId?: string,
  ): Promise<Map<string, LiveSyncFileRecord>> {
    const fileIds = matches.map((match) => match.id);
    if (fileIds.length === 0) {
      return new Map();
    }

    const files = (await this.prisma.syncFile.findMany({
      where: {
        id: { in: fileIds },
        isDeleted: false,
        vault: { userId },
        ...(vaultId ? { vaultId } : {}),
      },
      select: {
        id: true,
        title: true,
        path: true,
        vaultId: true,
        isDeleted: true,
      },
    })) as LiveSyncFileRecord[];

    return new Map(files.map((file) => [file.id, file]));
  }
}

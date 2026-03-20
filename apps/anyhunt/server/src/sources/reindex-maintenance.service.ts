/**
 * [INPUT]: MemoxReindexMaintenanceJobData
 * [OUTPUT]: Updated job data with progress counters
 * [POS]: Service for paginated bulk reindex of all active sources
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import {
  MEMOX_REINDEX_MAINTENANCE_QUEUE,
  type MemoxReindexMaintenanceJobData,
  type MemoxReindexMaintenanceJobState,
  type MemoxReindexMaintenanceJobStatus,
} from '../queue/queue.constants';
import { KnowledgeSourceRepository } from './knowledge-source.repository';
import { KnowledgeSourceRevisionService } from './knowledge-source-revision.service';
import { isSourceProcessingConflictError } from './source-processing.errors';

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_MAX_CONCURRENT = 3;
const ACTIVE_JOB_STATES: MemoxReindexMaintenanceJobState[] = [
  'waiting',
  'active',
  'delayed',
];
const TRACKED_JOB_STATES: MemoxReindexMaintenanceJobState[] = [
  ...ACTIVE_JOB_STATES,
  'completed',
  'failed',
];

@Injectable()
export class ReindexMaintenanceService {
  private readonly logger = new Logger(ReindexMaintenanceService.name);
  private static readonly JOB_ID_SEPARATOR = '__';

  constructor(
    private readonly sourceRepository: KnowledgeSourceRepository,
    private readonly revisionService: KnowledgeSourceRevisionService,
    @InjectQueue(MEMOX_REINDEX_MAINTENANCE_QUEUE)
    private readonly queue: Queue<MemoxReindexMaintenanceJobData>,
  ) {}

  private static readonly JOB_ID_PREFIX = 'reindex-maintenance';

  private encodeJobIdPart(value: string): string {
    return Buffer.from(value).toString('base64url');
  }

  private buildJobKey(apiKeyId: string): string {
    return [
      ReindexMaintenanceService.JOB_ID_PREFIX,
      this.encodeJobIdPart(apiKeyId),
    ].join(ReindexMaintenanceService.JOB_ID_SEPARATOR);
  }

  private buildChainedJobKey(chainId: string, cursor: string): string {
    return [
      ReindexMaintenanceService.JOB_ID_PREFIX,
      this.encodeJobIdPart(chainId),
      this.encodeJobIdPart(cursor),
    ].join(ReindexMaintenanceService.JOB_ID_SEPARATOR);
  }

  private async findLatestJobStatus(
    apiKeyId: string,
    states: MemoxReindexMaintenanceJobState[],
  ): Promise<MemoxReindexMaintenanceJobStatus | null> {
    const jobs = await this.queue.getJobs(states);
    const matched = jobs.filter((job) => job.data.apiKeyId === apiKeyId);
    if (matched.length === 0) {
      return null;
    }

    const byChain = new Map<string, typeof matched>();
    for (const job of matched) {
      const chainJobs = byChain.get(job.data.jobId);
      if (chainJobs) {
        chainJobs.push(job);
      } else {
        byChain.set(job.data.jobId, [job]);
      }
    }

    const latestChain = [...byChain.values()].sort((left, right) => {
      const leftStartedAt = Date.parse(left[0]?.data.startedAt ?? '');
      const rightStartedAt = Date.parse(right[0]?.data.startedAt ?? '');
      return rightStartedAt - leftStartedAt;
    })[0];

    if (!latestChain?.length) {
      return null;
    }

    const statePriority: Record<MemoxReindexMaintenanceJobState, number> = {
      active: 0,
      delayed: 1,
      waiting: 2,
      failed: 3,
      completed: 4,
    };

    const selected = (
      await Promise.all(
        latestChain.map(async (job) => ({
          job,
          state: (await job.getState()) as MemoxReindexMaintenanceJobState,
        })),
      )
    ).sort((left, right) => {
      const leftProgress =
        left.job.data.processedCount +
        left.job.data.failedCount +
        left.job.data.skippedCount;
      const rightProgress =
        right.job.data.processedCount +
        right.job.data.failedCount +
        right.job.data.skippedCount;
      if (leftProgress !== rightProgress) {
        return rightProgress - leftProgress;
      }
      return statePriority[left.state] - statePriority[right.state];
    })[0];

    if (!selected) {
      return null;
    }

    return {
      ...selected.job.data,
      state: selected.state,
      active: ACTIVE_JOB_STATES.includes(selected.state),
    };
  }

  async startJob(apiKeyId: string): Promise<MemoxReindexMaintenanceJobData> {
    // Per-apiKey singleton: check for existing active job
    const existingJob = await this.findLatestJobStatus(
      apiKeyId,
      ACTIVE_JOB_STATES,
    );
    if (existingJob) {
      return existingJob;
    }

    // Remove any stale failed job with the same key so BullMQ allows re-creation
    const jobKey = this.buildJobKey(apiKeyId);
    const existingBullJob = await this.queue.getJob(jobKey);
    if (existingBullJob) {
      const state = await existingBullJob.getState();
      if (state === 'failed' || state === 'completed') {
        await existingBullJob.remove();
      }
    }

    const totalSourceCount = await this.sourceRepository.countActive(apiKeyId);
    const jobData: MemoxReindexMaintenanceJobData = {
      jobId: randomUUID(),
      apiKeyId,
      cursor: null,
      pageSize: DEFAULT_PAGE_SIZE,
      maxConcurrent: DEFAULT_MAX_CONCURRENT,
      processedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      totalSourceCount,
      lastError: null,
      startedAt: new Date().toISOString(),
    };

    await this.queue.add('reindex-batch', jobData, {
      jobId: jobKey,
      removeOnComplete: 10,
      removeOnFail: 50,
      attempts: 1,
    });

    return jobData;
  }

  async getJobStatus(
    apiKeyId: string,
  ): Promise<MemoxReindexMaintenanceJobStatus | null> {
    return this.findLatestJobStatus(apiKeyId, TRACKED_JOB_STATES);
  }

  async processBatch(
    data: MemoxReindexMaintenanceJobData,
  ): Promise<MemoxReindexMaintenanceJobData> {
    const { apiKeyId, pageSize, maxConcurrent } = data;
    const { cursor } = data;
    let { processedCount, failedCount, skippedCount, totalSourceCount } = data;
    let lastError = data.lastError;

    // Count total sources on first batch
    if (totalSourceCount === null) {
      totalSourceCount = await this.sourceRepository.countActive(apiKeyId);
      this.logger.log(
        `Reindex maintenance: ${totalSourceCount} active sources for apiKey=${apiKeyId}`,
      );
    }

    // Fetch a page of active sources with currentRevisionId
    const sources = await this.sourceRepository.findActiveForReindex(
      apiKeyId,
      cursor,
      pageSize,
    );

    if (sources.length === 0) {
      this.logger.log(
        `Reindex maintenance complete: processed=${processedCount} failed=${failedCount} skipped=${skippedCount} total=${totalSourceCount}`,
      );
      return {
        ...data,
        cursor: null,
        processedCount,
        failedCount,
        skippedCount,
        totalSourceCount,
        lastError,
      };
    }

    // Process sources with concurrency limit
    const batches: Array<typeof sources> = [];
    for (let i = 0; i < sources.length; i += maxConcurrent) {
      batches.push(sources.slice(i, i + maxConcurrent));
    }

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map(async (source) => {
          // currentRevisionId is guaranteed non-null by findActiveForReindex query filter
          await this.revisionService.reindex(
            apiKeyId,
            source.currentRevisionId!,
          );
          processedCount += 1;
        }),
      );

      for (const result of results) {
        if (result.status === 'rejected') {
          if (isSourceProcessingConflictError(result.reason)) {
            const message =
              result.reason instanceof Error
                ? result.reason.message
                : 'Knowledge source is processing';
            // Source is being processed by a live finalize/reindex — skip, don't count as failure.
            // It will either finish with new chunking (if triggered after deploy) or
            // be picked up on the next maintenance run.
            skippedCount += 1;
            this.logger.log(
              `Reindex maintenance skipped (lease conflict): ${message}`,
            );
          } else {
            const message =
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason);
            failedCount += 1;
            lastError = message;
            this.logger.warn(`Reindex maintenance source failed: ${message}`);
          }
        }
      }
    }

    // Determine next cursor
    const lastSource = sources[sources.length - 1];
    const nextCursor = lastSource ? lastSource.id : null;
    const hasMore = sources.length >= pageSize;

    const updatedData: MemoxReindexMaintenanceJobData = {
      ...data,
      cursor: hasMore ? nextCursor : null,
      processedCount,
      failedCount,
      skippedCount,
      totalSourceCount,
      lastError,
    };

    // Enqueue next batch if there are more sources.
    // Use same deterministic jobId so singleton detection in startJob()
    // can find chained jobs and prevent concurrent job chains.
    if (hasMore && nextCursor) {
      await this.queue.add('reindex-batch', updatedData, {
        // Chained batches need a unique BullMQ jobId. Reusing the active job's
        // deterministic singleton key causes BullMQ deduplication to drop the add.
        jobId: this.buildChainedJobKey(data.jobId, nextCursor),
        removeOnComplete: 10,
        removeOnFail: 50,
        attempts: 1,
      });
    } else {
      this.logger.log(
        `Reindex maintenance complete: processed=${processedCount} failed=${failedCount} skipped=${skippedCount} total=${totalSourceCount}`,
      );
    }

    return updatedData;
  }
}

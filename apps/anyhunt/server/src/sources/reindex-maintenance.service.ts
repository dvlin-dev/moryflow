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
} from '../queue/queue.constants';
import { KnowledgeSourceRepository } from './knowledge-source.repository';
import { KnowledgeSourceRevisionService } from './knowledge-source-revision.service';

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_MAX_CONCURRENT = 3;

@Injectable()
export class ReindexMaintenanceService {
  private readonly logger = new Logger(ReindexMaintenanceService.name);

  constructor(
    private readonly sourceRepository: KnowledgeSourceRepository,
    private readonly revisionService: KnowledgeSourceRevisionService,
    @InjectQueue(MEMOX_REINDEX_MAINTENANCE_QUEUE)
    private readonly queue: Queue<MemoxReindexMaintenanceJobData>,
  ) {}

  private static readonly JOB_ID_PREFIX = 'reindex-maintenance';

  private buildJobKey(apiKeyId: string): string {
    return `${ReindexMaintenanceService.JOB_ID_PREFIX}:${apiKeyId}`;
  }

  async startJob(apiKeyId: string): Promise<MemoxReindexMaintenanceJobData> {
    // Per-apiKey singleton: check for existing active job
    const existingJob = await this.getJobStatus(apiKeyId);
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

    const jobData: MemoxReindexMaintenanceJobData = {
      jobId: randomUUID(),
      apiKeyId,
      cursor: null,
      pageSize: DEFAULT_PAGE_SIZE,
      maxConcurrent: DEFAULT_MAX_CONCURRENT,
      processedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      totalSourceCount: null,
      lastError: null,
      startedAt: new Date().toISOString(),
    };

    await this.queue.add('reindex-batch', jobData, {
      jobId: jobKey,
      removeOnComplete: 10,
      removeOnFail: 50,
      attempts: 1,
      timeout: 30 * 60 * 1000, // 30 minutes per batch
    });

    return jobData;
  }

  async getJobStatus(apiKeyId: string): Promise<MemoxReindexMaintenanceJobData | null> {
    // Check for active jobs by scanning waiting + active + delayed
    const [waiting, active, delayed] = await Promise.all([
      this.queue.getJobs(['waiting']),
      this.queue.getJobs(['active']),
      this.queue.getJobs(['delayed']),
    ]);

    const allJobs = [...waiting, ...active, ...delayed];
    const match = allJobs.find((job) => job.data.apiKeyId === apiKeyId);
    return match?.data ?? null;
  }

  async processBatch(
    data: MemoxReindexMaintenanceJobData,
  ): Promise<MemoxReindexMaintenanceJobData> {
    const { apiKeyId, pageSize, maxConcurrent } = data;
    let { cursor, processedCount, failedCount, skippedCount, totalSourceCount } =
      data;

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
        lastError: null,
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
          const message =
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);
          const isLeaseConflict =
            message.includes('is processing') ||
            message.includes('processing-lock');
          if (isLeaseConflict) {
            // Source is being processed by a live finalize/reindex — skip, don't count as failure.
            // It will either finish with new chunking (if triggered after deploy) or
            // be picked up on the next maintenance run.
            skippedCount += 1;
            this.logger.log(`Reindex maintenance skipped (lease conflict): ${message}`);
          } else {
            failedCount += 1;
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
      lastError: null,
    };

    // Enqueue next batch if there are more sources
    if (hasMore && nextCursor) {
      await this.queue.add('reindex-batch', updatedData, {
        removeOnComplete: 10,
        removeOnFail: 50,
        attempts: 1,
        timeout: 30 * 60 * 1000,
      });
    } else {
      this.logger.log(
        `Reindex maintenance complete: processed=${processedCount} failed=${failedCount} skipped=${skippedCount} total=${totalSourceCount}`,
      );
    }

    return updatedData;
  }
}

/**
 * [INPUT]: BullMQ graph projection job
 * [OUTPUT]: graph projection / cleanup side effects
 * [POS]: Graph queue 处理器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  MEMOX_GRAPH_PROJECTION_QUEUE,
  type MemoxGraphProjectionJobData,
} from '../queue';
import { GraphProjectionService } from './graph-projection.service';

@Processor(MEMOX_GRAPH_PROJECTION_QUEUE)
export class GraphProcessor extends WorkerHost {
  private readonly logger = new Logger(GraphProcessor.name);

  constructor(private readonly projectionService: GraphProjectionService) {
    super();
  }

  async process(job: Job<MemoxGraphProjectionJobData>) {
    this.logger.log(`Processing graph job: ${job.id} (${job.data.kind})`);
    await this.projectionService.processJob(job.data);
    return {
      kind: job.data.kind,
      status: 'COMPLETED',
    };
  }
}

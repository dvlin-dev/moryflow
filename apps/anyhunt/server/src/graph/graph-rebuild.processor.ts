import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  MEMOX_GRAPH_SCOPE_REBUILD_QUEUE,
  type MemoxGraphScopeRebuildJobData,
} from '../queue';
import { GraphRebuildService } from './graph-rebuild.service';

@Processor(MEMOX_GRAPH_SCOPE_REBUILD_QUEUE)
export class GraphRebuildProcessor extends WorkerHost {
  private readonly logger = new Logger(GraphRebuildProcessor.name);

  constructor(private readonly graphRebuildService: GraphRebuildService) {
    super();
  }

  async process(job: Job<MemoxGraphScopeRebuildJobData>) {
    this.logger.log(
      `Processing graph rebuild job: runId=${job.data.runId} scope=${job.data.graphScopeId}`,
    );

    const result = await this.graphRebuildService.processRun(job.data);

    this.logger.log(
      `Graph rebuild job complete: runId=${job.data.runId} status=${result.status} processed=${result.processed_items} failed=${result.failed_items}`,
    );

    return result;
  }
}

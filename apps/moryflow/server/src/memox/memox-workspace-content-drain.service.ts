import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  MEMOX_WORKSPACE_CONTENT_BATCH_LIMIT,
  MEMOX_WORKSPACE_CONTENT_CONSUMER_ID,
  MEMOX_WORKSPACE_CONTENT_LEASE_MS,
  MEMOX_WORKSPACE_CONTENT_MAX_BATCHES,
} from './memox-workspace-content.constants';
import { MemoxWorkspaceContentConsumerService } from './memox-workspace-content-consumer.service';

@Injectable()
export class MemoxWorkspaceContentDrainService {
  private readonly logger = new Logger(MemoxWorkspaceContentDrainService.name);
  private activeDrain: Promise<void> | null = null;

  constructor(
    private readonly consumerService: MemoxWorkspaceContentConsumerService,
  ) {}

  @Cron('*/5 * * * * *')
  async scheduleDrain(): Promise<void> {
    if (this.activeDrain) {
      await this.activeDrain;
      return;
    }

    const run = this.drainPendingOutbox();
    this.activeDrain = run;
    try {
      await run;
    } finally {
      if (this.activeDrain === run) {
        this.activeDrain = null;
      }
    }
  }

  private async drainPendingOutbox(): Promise<void> {
    try {
      for (
        let batch = 0;
        batch < MEMOX_WORKSPACE_CONTENT_MAX_BATCHES;
        batch += 1
      ) {
        const result = await this.consumerService.processBatch({
          consumerId: MEMOX_WORKSPACE_CONTENT_CONSUMER_ID,
          limit: MEMOX_WORKSPACE_CONTENT_BATCH_LIMIT,
          leaseMs: MEMOX_WORKSPACE_CONTENT_LEASE_MS,
        });

        if (result.claimed < MEMOX_WORKSPACE_CONTENT_BATCH_LIMIT) {
          break;
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      this.logger.error(`Workspace content direct drain failed: ${message}`);
      throw error;
    }
  }
}

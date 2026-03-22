import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MEMOX_WORKSPACE_CONTENT_RECONCILE_BATCH_LIMIT } from './memox-workspace-content.constants';
import { MemoxWorkspaceContentReconcileService } from './memox-workspace-content-reconcile.service';

@Injectable()
export class MemoxWorkspaceContentReconcileScheduler {
  private readonly logger = new Logger(
    MemoxWorkspaceContentReconcileScheduler.name,
  );

  constructor(
    private readonly reconcileService: MemoxWorkspaceContentReconcileService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async run(): Promise<void> {
    try {
      const enqueuedCount = await this.reconcileService.reconcile({
        limit: MEMOX_WORKSPACE_CONTENT_RECONCILE_BATCH_LIMIT,
      });

      if (enqueuedCount > 0) {
        this.logger.log(
          `Workspace content reconcile enqueued ${enqueuedCount} document state event(s)`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      this.logger.error(`Workspace content reconcile failed: ${message}`);
    }
  }
}

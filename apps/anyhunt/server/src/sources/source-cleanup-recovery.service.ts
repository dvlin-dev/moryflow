/**
 * [INPUT]: cron tick
 * [OUTPUT]: re-enqueued cleanup jobs for deleted sources
 * [POS]: Sources 删除恢复扫描，保证 DELETED source 最终完成 cleanup
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { KnowledgeSourceRepository } from './knowledge-source.repository';
import { KnowledgeSourceDeletionService } from './knowledge-source-deletion.service';

const SOURCE_CLEANUP_RECOVERY_CRON = '0 */5 * * * *';
const SOURCE_CLEANUP_RECOVERY_BATCH_SIZE = 100;

@Injectable()
export class SourceCleanupRecoveryService {
  constructor(
    private readonly sourceRepository: KnowledgeSourceRepository,
    private readonly sourceDeletionService: KnowledgeSourceDeletionService,
  ) {}

  @Cron(SOURCE_CLEANUP_RECOVERY_CRON)
  async recoverDeletedSources(): Promise<void> {
    const deletedSources = await this.sourceRepository.findDeletedSources(
      SOURCE_CLEANUP_RECOVERY_BATCH_SIZE,
    );

    await Promise.all(
      deletedSources.map((source) =>
        this.sourceDeletionService.enqueueCleanupJob(
          source.apiKeyId,
          source.id,
        ),
      ),
    );
  }
}

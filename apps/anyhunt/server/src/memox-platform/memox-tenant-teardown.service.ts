/**
 * [INPUT]: apiKeyId
 * [OUTPUT]: fully deleted Memox tenant storage + vector/source/graph rows
 * [POS]: Memox tenant teardown single source for API key cleanup and reset flows
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { MEMORY_EXPORT_VAULT_ID } from '../memory/memory.constants';
import { StorageClient } from '../storage';
import { VectorPrismaService } from '../vector-prisma';

interface SourceStorageGroup {
  tenantId: string;
  vaultId: string;
  fileIds: string[];
}

@Injectable()
export class MemoxTenantTeardownService {
  constructor(
    private readonly vectorPrisma: VectorPrismaService,
    private readonly storageClient: StorageClient,
  ) {}

  async deleteApiKeyTenant(apiKeyId: string): Promise<void> {
    const [revisions, exports] = await Promise.all([
      this.vectorPrisma.knowledgeSourceRevision.findMany({
        where: { apiKeyId },
        select: {
          normalizedTextR2Key: true,
          blobR2Key: true,
        },
      }),
      this.vectorPrisma.memoryFactExport.findMany({
        where: { apiKeyId },
        select: {
          r2Key: true,
        },
      }),
    ]);

    await this.deleteSourceObjects(
      revisions.flatMap((revision) =>
        [revision.normalizedTextR2Key, revision.blobR2Key].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    );
    await this.deleteExportObjects(
      apiKeyId,
      exports
        .map((exportRecord) => exportRecord.r2Key)
        .filter((value): value is string => Boolean(value?.trim())),
    );

    await this.vectorPrisma.$transaction([
      this.vectorPrisma.graphProjectionRun.deleteMany({
        where: {
          graphScope: { apiKeyId },
        },
      }),
      this.vectorPrisma.graphObservation.deleteMany({
        where: {
          graphScope: { apiKeyId },
        },
      }),
      this.vectorPrisma.graphRelation.deleteMany({
        where: {
          graphScope: { apiKeyId },
        },
      }),
      this.vectorPrisma.graphEntity.deleteMany({
        where: {
          graphScope: { apiKeyId },
        },
      }),
      this.vectorPrisma.graphScope.deleteMany({ where: { apiKeyId } }),
      this.vectorPrisma.sourceChunk.deleteMany({ where: { apiKeyId } }),
      this.vectorPrisma.knowledgeSourceRevision.deleteMany({
        where: { apiKeyId },
      }),
      this.vectorPrisma.knowledgeSource.deleteMany({ where: { apiKeyId } }),
      this.vectorPrisma.memoryFactHistory.deleteMany({ where: { apiKeyId } }),
      this.vectorPrisma.memoryFactFeedback.deleteMany({ where: { apiKeyId } }),
      this.vectorPrisma.memoryFactExport.deleteMany({ where: { apiKeyId } }),
      this.vectorPrisma.scopeRegistry.deleteMany({ where: { apiKeyId } }),
      this.vectorPrisma.memoryFact.deleteMany({ where: { apiKeyId } }),
    ]);
  }

  private async deleteSourceObjects(r2Keys: string[]): Promise<void> {
    const uniqueKeys = [...new Set(r2Keys.map((value) => value.trim()))].filter(
      (value) => value.length > 0,
    );
    if (uniqueKeys.length === 0) {
      return;
    }

    const groups = new Map<string, SourceStorageGroup>();

    for (const r2Key of uniqueKeys) {
      const location = this.parseSourceR2Key(r2Key);
      const groupKey = `${location.tenantId}/${location.vaultId}`;
      const existing = groups.get(groupKey);
      if (existing) {
        existing.fileIds.push(location.fileId);
        continue;
      }

      groups.set(groupKey, {
        tenantId: location.tenantId,
        vaultId: location.vaultId,
        fileIds: [location.fileId],
      });
    }

    for (const group of groups.values()) {
      const deleted = await this.storageClient.deleteFiles(
        group.tenantId,
        group.vaultId,
        group.fileIds,
      );
      if (!deleted) {
        throw new Error(
          `Failed to delete Memox tenant objects for ${group.tenantId}/${group.vaultId}`,
        );
      }
    }
  }

  private async deleteExportObjects(
    apiKeyId: string,
    exportObjectIds: string[],
  ): Promise<void> {
    const fileIds = [
      ...new Set(exportObjectIds.map((value) => value.trim())),
    ].filter((value) => value.length > 0);
    if (fileIds.length === 0) {
      return;
    }

    const deleted = await this.storageClient.deleteFiles(
      apiKeyId,
      MEMORY_EXPORT_VAULT_ID,
      fileIds,
    );
    if (!deleted) {
      throw new Error(
        `Failed to delete Memox tenant export objects for ${apiKeyId}/${MEMORY_EXPORT_VAULT_ID}`,
      );
    }
  }

  private parseSourceR2Key(r2Key: string): {
    tenantId: string;
    vaultId: string;
    fileId: string;
  } {
    const [tenantId, vaultId, ...rest] = r2Key.split('/');
    if (!tenantId || !vaultId || rest.length === 0) {
      throw new Error(`Invalid source R2 key: ${r2Key}`);
    }

    return {
      tenantId,
      vaultId,
      fileId: rest.join('/'),
    };
  }
}

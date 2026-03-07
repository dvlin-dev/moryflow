import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma';
import { StorageClient } from '../storage';
import { MemoxClient, MemoxGatewayError } from './memox.client';
import { MemoxRuntimeConfigService } from './memox-runtime-config.service';
import { LegacyVectorSearchClient } from './legacy-vector-search.client';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';

export interface MemoxUpsertFileInput {
  eventId: string;
  userId: string;
  vaultId: string;
  fileId: string;
  path: string;
  title: string;
  contentHash: string;
  storageRevision: string;
  previousContentHash: string | null;
  previousStorageRevision: string | null;
}

export interface MemoxDeleteFileInput {
  eventId: string;
  userId: string;
  vaultId: string;
  fileId: string;
}

interface CurrentSyncFileState {
  isDeleted: boolean;
  path: string;
  title: string;
  contentHash: string;
  storageRevision: string;
}

@Injectable()
export class MemoxFileProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memoxClient: MemoxClient,
    private readonly bridgeService: MemoxSourceBridgeService,
    private readonly storageClient: StorageClient,
    private readonly runtimeConfigService: MemoxRuntimeConfigService,
    private readonly legacyVectorSearchClient: LegacyVectorSearchClient,
  ) {}

  async upsertFile(params: MemoxUpsertFileInput): Promise<void> {
    const currentFile = await this.readCurrentSyncFileState(params);
    if (this.isStaleUpsert(currentFile, params)) {
      return;
    }

    const idempotency = this.bridgeService.buildLifecycleIdempotencyFamily(
      params.eventId,
    );
    const identity = this.bridgeService.buildSourceIdentityInput(
      {
        userId: params.userId,
        vaultId: params.vaultId,
        fileId: params.fileId,
        title: params.title,
        displayPath: params.path,
        mimeType: 'text/markdown',
        contentHash: params.contentHash,
        storageRevision: params.storageRevision,
      },
      {
        includeLifecycleMetadata: false,
      },
    );
    const source = await this.memoxClient.resolveSourceIdentity({
      sourceType: identity.sourceType,
      externalId: identity.externalId,
      body: identity.body,
      idempotencyKey: idempotency.sourceIdentity,
      requestId: params.eventId,
    });

    const content = await this.readVerifiedSyncSnapshot(
      params.userId,
      params.vaultId,
      params.fileId,
      params.storageRevision,
      params.contentHash,
    );

    if (!this.isSourceGenerationAligned(source, params)) {
      const revision = await this.memoxClient.createSourceRevision({
        sourceId: source.source_id,
        idempotencyKey: idempotency.revisionCreate,
        requestId: params.eventId,
        body: this.bridgeService.buildInlineRevisionBody({
          content,
          mimeType: 'text/markdown',
        }),
      });
      await this.memoxClient.finalizeSourceRevision({
        revisionId: revision.id,
        idempotencyKey: idempotency.revisionFinalize,
        requestId: params.eventId,
      });

      const materializedIdentity = this.bridgeService.buildSourceIdentityInput({
        userId: params.userId,
        vaultId: params.vaultId,
        fileId: params.fileId,
        title: params.title,
        displayPath: params.path,
        mimeType: 'text/markdown',
        contentHash: params.contentHash,
        storageRevision: params.storageRevision,
      });
      await this.memoxClient.resolveSourceIdentity({
        sourceType: materializedIdentity.sourceType,
        externalId: materializedIdentity.externalId,
        body: materializedIdentity.body,
        idempotencyKey: idempotency.sourceIdentityMaterialize,
        requestId: params.eventId,
      });
    }

    if (!this.runtimeConfigService.isLegacyVectorBaselineEnabled()) {
      return;
    }

    await this.legacyVectorSearchClient.upsertFile({
      userId: params.userId,
      fileId: params.fileId,
      content,
      vaultId: params.vaultId,
      title: params.title,
      path: params.path,
    });
  }

  async deleteFile(params: MemoxDeleteFileInput): Promise<void> {
    const currentFile = await this.readCurrentSyncFileState(params);
    if (currentFile && !currentFile.isDeleted) {
      return;
    }

    const idempotency = this.bridgeService.buildLifecycleIdempotencyFamily(
      params.eventId,
    );
    const identity = this.bridgeService.buildSourceIdentityLookupInput({
      userId: params.userId,
      vaultId: params.vaultId,
      fileId: params.fileId,
    });

    try {
      const source = await this.memoxClient.resolveSourceIdentity({
        sourceType: identity.sourceType,
        externalId: identity.externalId,
        body: identity.body,
        idempotencyKey: idempotency.sourceIdentity,
        requestId: params.eventId,
      });

      await this.memoxClient.deleteSource({
        sourceId: source.source_id,
        idempotencyKey: idempotency.sourceDelete,
        requestId: params.eventId,
      });
    } catch (error) {
      if (!this.isMissingSourceIdentity(error)) {
        throw error;
      }
    }

    if (!this.runtimeConfigService.isLegacyVectorBaselineEnabled()) {
      return;
    }

    await this.legacyVectorSearchClient.deleteFile({
      userId: params.userId,
      fileId: params.fileId,
    });
  }

  private isSourceGenerationAligned(
    source: Awaited<ReturnType<MemoxClient['resolveSourceIdentity']>>,
    params: Pick<MemoxUpsertFileInput, 'contentHash' | 'storageRevision'>,
  ): boolean {
    if (!source.current_revision_id) {
      return false;
    }

    const metadata =
      source.metadata && typeof source.metadata === 'object'
        ? source.metadata
        : null;
    if (!metadata) {
      return false;
    }

    return (
      metadata.content_hash === params.contentHash &&
      metadata.storage_revision === params.storageRevision
    );
  }

  private isStaleUpsert(
    currentFile: CurrentSyncFileState | null,
    params: Pick<
      MemoxUpsertFileInput,
      'path' | 'title' | 'contentHash' | 'storageRevision'
    >,
  ): boolean {
    if (!currentFile || currentFile.isDeleted) {
      return true;
    }

    return (
      currentFile.path !== params.path ||
      currentFile.title !== params.title ||
      currentFile.contentHash !== params.contentHash ||
      currentFile.storageRevision !== params.storageRevision
    );
  }

  private isMissingSourceIdentity(error: unknown): boolean {
    return (
      error instanceof MemoxGatewayError &&
      (error.status === 404 ||
        (error.status === 400 &&
          error.code === 'SOURCE_IDENTITY_TITLE_REQUIRED'))
    );
  }

  private async readVerifiedSyncSnapshot(
    userId: string,
    vaultId: string,
    fileId: string,
    storageRevision: string,
    expectedContentHash: string,
  ): Promise<string> {
    const result = await this.storageClient.downloadSyncStream(
      userId,
      vaultId,
      fileId,
      storageRevision,
    );
    const currentStorageRevision = result.metadata?.storagerevision ?? null;
    const currentContentHash = result.metadata?.contenthash ?? null;

    if (
      currentStorageRevision !== storageRevision ||
      currentContentHash !== expectedContentHash
    ) {
      throw new Error('Sync snapshot metadata mismatch');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of result.stream as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }

    const buffer = Buffer.concat(chunks);
    const actualHash = createHash('sha256').update(buffer).digest('hex');
    if (actualHash !== expectedContentHash) {
      throw new Error('Sync snapshot content hash mismatch');
    }

    return buffer.toString('utf8');
  }

  private async readCurrentSyncFileState(
    params: Pick<
      MemoxUpsertFileInput | MemoxDeleteFileInput,
      'userId' | 'vaultId' | 'fileId'
    >,
  ): Promise<CurrentSyncFileState | null> {
    return this.prisma.syncFile.findFirst({
      where: {
        id: params.fileId,
        vaultId: params.vaultId,
        vault: {
          userId: params.userId,
        },
      },
      select: {
        isDeleted: true,
        path: true,
        title: true,
        contentHash: true,
        storageRevision: true,
      },
    });
  }
}

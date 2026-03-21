import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { StorageClient } from '../storage';
import { MemoxClient, MemoxGatewayError } from './memox.client';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';
import { MemoxTelemetryService } from './memox-telemetry.service';
import type {
  WorkspaceContentDeletePayload,
  WorkspaceContentUpsertPayload,
} from './memox-source-contract';

export type MemoxWorkspaceContentUpsertInput = WorkspaceContentUpsertPayload & {
  eventId: string;
};

export type MemoxWorkspaceContentDeleteInput = WorkspaceContentDeletePayload & {
  eventId: string;
};

@Injectable()
export class MemoxWorkspaceContentProjectionService {
  constructor(
    private readonly memoxClient: MemoxClient,
    private readonly bridgeService: MemoxSourceBridgeService,
    private readonly storageClient: StorageClient,
    private readonly telemetryService: MemoxTelemetryService,
  ) {}

  async upsertDocument(
    params: MemoxWorkspaceContentUpsertInput,
  ): Promise<void> {
    this.telemetryService.recordUpsertRequest();
    const idempotency = this.bridgeService.buildLifecycleIdempotencyFamily(
      params.eventId,
    );
    const lookup = this.bridgeService.buildSourceIdentityLookupQuery({
      userId: params.userId,
      workspaceId: params.workspaceId,
      documentId: params.documentId,
    });
    let existingSource: Awaited<
      ReturnType<MemoxClient['getSourceIdentity']>
    > | null = null;

    try {
      existingSource = await this.memoxClient.getSourceIdentity({
        sourceType: lookup.sourceType,
        externalId: lookup.externalId,
        query: lookup.query,
        requestId: params.eventId,
      });
      this.telemetryService.recordIdentityLookup();
    } catch (error) {
      if (!this.isMissingSourceIdentity(error)) {
        throw error;
      }
    }

    const stableIdentity = this.bridgeService.buildSourceIdentityInput(
      {
        userId: params.userId,
        workspaceId: params.workspaceId,
        documentId: params.documentId,
        title: params.title,
        displayPath: params.path,
        mimeType: params.mimeType,
        contentHash: params.contentHash,
      },
      { includeLifecycleMetadata: false },
    );

    const source = await this.memoxClient.resolveSourceIdentity({
      sourceType: stableIdentity.sourceType,
      externalId: stableIdentity.externalId,
      body: stableIdentity.body,
      idempotencyKey: idempotency.sourceIdentity,
      requestId: params.eventId,
    });
    this.telemetryService.recordIdentityResolve();

    const content = await this.readContent(params);

    // When a previously indexed document is cleared to empty text, delete the
    // source so stale revisions don't remain searchable. If the source has no
    // revision yet, there is nothing to clean up.
    if (content.length === 0) {
      if (source.current_revision_id) {
        try {
          await this.memoxClient.deleteSource({
            sourceId: source.source_id,
            idempotencyKey: idempotency.sourceDelete,
            requestId: params.eventId,
          });
          this.telemetryService.recordSourceDelete();
        } catch (error) {
          if (!this.isMissingSourceIdentity(error)) {
            throw error;
          }
        }
      }
      return;
    }

    const metadata =
      existingSource?.metadata && typeof existingSource.metadata === 'object'
        ? existingSource.metadata
        : null;
    const currentHash =
      metadata && typeof metadata.content_hash === 'string'
        ? metadata.content_hash
        : null;

    if (source.current_revision_id && currentHash === params.contentHash) {
      this.telemetryService.recordUnchangedSkip();
      return;
    }

    const revision = await this.memoxClient.createSourceRevision({
      sourceId: source.source_id,
      body: this.bridgeService.buildInlineRevisionBody({
        content,
        mimeType: params.mimeType,
      }),
      idempotencyKey: idempotency.revisionCreate,
      requestId: params.eventId,
    });
    this.telemetryService.recordRevisionCreate();

    await this.memoxClient.finalizeSourceRevision({
      revisionId: revision.id,
      idempotencyKey: idempotency.revisionFinalize,
      requestId: params.eventId,
    });
    this.telemetryService.recordRevisionFinalize();

    const materializedIdentity = this.bridgeService.buildSourceIdentityInput(
      {
        userId: params.userId,
        workspaceId: params.workspaceId,
        documentId: params.documentId,
        title: params.title,
        displayPath: params.path,
        mimeType: params.mimeType,
        contentHash: params.contentHash,
      },
      { includeLifecycleMetadata: true },
    );

    await this.memoxClient.resolveSourceIdentity({
      sourceType: materializedIdentity.sourceType,
      externalId: materializedIdentity.externalId,
      body: materializedIdentity.body,
      idempotencyKey: idempotency.sourceIdentityMaterialize,
      requestId: params.eventId,
    });
    this.telemetryService.recordIdentityResolve();
  }

  async deleteDocument(
    params: MemoxWorkspaceContentDeleteInput,
  ): Promise<void> {
    this.telemetryService.recordDeleteRequest();
    const idempotency = this.bridgeService.buildLifecycleIdempotencyFamily(
      params.eventId,
    );
    const identity = this.bridgeService.buildSourceIdentityLookupQuery({
      userId: params.userId,
      workspaceId: params.workspaceId,
      documentId: params.documentId,
    });

    try {
      const source = await this.memoxClient.getSourceIdentity({
        sourceType: identity.sourceType,
        externalId: identity.externalId,
        query: identity.query,
        requestId: params.eventId,
      });
      this.telemetryService.recordIdentityLookup();

      await this.memoxClient.deleteSource({
        sourceId: source.source_id,
        idempotencyKey: idempotency.sourceDelete,
        requestId: params.eventId,
      });
      this.telemetryService.recordSourceDelete();
    } catch (error) {
      if (!this.isMissingSourceIdentity(error)) {
        throw error;
      }
      this.telemetryService.recordIdentityLookupMiss();
    }
  }

  private async readContent(
    params: WorkspaceContentUpsertPayload,
  ): Promise<string> {
    if (params.mode === 'inline_text') {
      return params.content;
    }

    const result = await this.storageClient.downloadSyncStream(
      params.userId,
      params.vaultId,
      params.fileId,
      params.storageRevision,
    );
    const currentStorageRevision = result.metadata?.storagerevision ?? null;
    const currentContentHash = result.metadata?.contenthash ?? null;

    if (
      currentStorageRevision !== params.storageRevision ||
      currentContentHash !== params.contentHash
    ) {
      throw new Error('Sync snapshot metadata mismatch');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of result.stream as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }

    const buffer = Buffer.concat(chunks);
    const actualHash = createHash('sha256').update(buffer).digest('hex');
    if (actualHash !== params.contentHash) {
      throw new Error('Sync snapshot content hash mismatch');
    }

    return buffer.toString('utf8');
  }

  private isMissingSourceIdentity(error: unknown): boolean {
    return (
      error instanceof MemoxGatewayError &&
      (error.status === 404 ||
        (error.status === 409 && error.code === 'SOURCE_IDENTITY_DELETED'))
    );
  }
}

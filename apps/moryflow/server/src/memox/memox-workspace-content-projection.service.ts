import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { StorageClient } from '../storage';
import { MemoxClient, MemoxGatewayError } from './memox.client';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';
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
  ) {}

  async upsertDocument(
    params: MemoxWorkspaceContentUpsertInput,
  ): Promise<void> {
    const idempotency = this.bridgeService.buildLifecycleIdempotencyFamily(
      params.eventId,
    );
    const identity = this.bridgeService.buildSourceIdentityInput({
      userId: params.userId,
      workspaceId: params.workspaceId,
      documentId: params.documentId,
      title: params.title,
      displayPath: params.path,
      mimeType: params.mimeType,
      contentHash: params.contentHash,
    });

    const source = await this.memoxClient.resolveSourceIdentity({
      sourceType: identity.sourceType,
      externalId: identity.externalId,
      body: identity.body,
      idempotencyKey: idempotency.sourceIdentity,
      requestId: params.eventId,
    });

    const content = await this.readContent(params);

    // Skip empty documents — the downstream Memox API requires content.min(1).
    // Empty workspace files are a valid no-op, not an error.
    if (content.length === 0) {
      return;
    }

    const metadata =
      source.metadata && typeof source.metadata === 'object'
        ? source.metadata
        : null;
    const currentHash =
      metadata && typeof metadata.content_hash === 'string'
        ? metadata.content_hash
        : null;

    if (source.current_revision_id && currentHash === params.contentHash) {
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

    await this.memoxClient.finalizeSourceRevision({
      revisionId: revision.id,
      idempotencyKey: idempotency.revisionFinalize,
      requestId: params.eventId,
    });
  }

  async deleteDocument(
    params: MemoxWorkspaceContentDeleteInput,
  ): Promise<void> {
    const idempotency = this.bridgeService.buildLifecycleIdempotencyFamily(
      params.eventId,
    );
    const identity = this.bridgeService.buildSourceIdentityLookupInput({
      userId: params.userId,
      workspaceId: params.workspaceId,
      documentId: params.documentId,
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
        (error.status === 409 && error.code === 'SOURCE_IDENTITY_DELETED') ||
        (error.status === 400 &&
          error.code === 'SOURCE_IDENTITY_TITLE_REQUIRED'))
    );
  }
}

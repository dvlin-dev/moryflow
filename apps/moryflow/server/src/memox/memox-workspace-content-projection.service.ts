import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { classifyIndexableText } from '@moryflow/api';
import { WorkspaceContentOutboxResultDisposition } from '../../generated/prisma/enums';
import { StorageClient } from '../storage';
import { PrismaService } from '../prisma';
import { MemoxClient, MemoxGatewayError } from './memox.client';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';
import { MemoxTelemetryService } from './memox-telemetry.service';
import type {
  WorkspaceContentDeletePayload,
  WorkspaceContentUpsertPayload,
} from './memox-source-contract';

export type MemoxWorkspaceContentUpsertInput = WorkspaceContentUpsertPayload & {
  eventId: string;
  revisionId: string;
};

export type MemoxWorkspaceContentDeleteInput = WorkspaceContentDeletePayload & {
  eventId: string;
};

export interface MemoxWorkspaceContentProjectionResult {
  disposition: WorkspaceContentOutboxResultDisposition | null;
}

@Injectable()
export class MemoxWorkspaceContentProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memoxClient: MemoxClient,
    private readonly bridgeService: MemoxSourceBridgeService,
    private readonly storageClient: StorageClient,
    private readonly telemetryService: MemoxTelemetryService,
  ) {}

  async upsertDocument(
    params: MemoxWorkspaceContentUpsertInput,
  ): Promise<MemoxWorkspaceContentProjectionResult> {
    this.telemetryService.recordUpsertRequest();
    const idempotency = this.bridgeService.buildLifecycleIdempotencyFamily(
      `workspace-content-revision:${params.revisionId}`,
    );
    const activeRevisionId = await this.getActiveRevisionId(
      params.workspaceId,
      params.documentId,
    );
    if (activeRevisionId !== params.revisionId) {
      return { disposition: null };
    }

    const stableIdentity = this.bridgeService.buildSourceIdentityInput({
      userId: params.userId,
      workspaceId: params.workspaceId,
      documentId: params.documentId,
      title: params.title,
      displayPath: params.path,
      mimeType: params.mimeType,
    });

    const content = await this.readContent(params);
    const classification = classifyIndexableText(content);

    if (!classification.indexable) {
      await this.deleteExistingSource(params, idempotency.sourceDelete);
      return {
        disposition: WorkspaceContentOutboxResultDisposition.QUIET_SKIPPED,
      };
    }

    const source = await this.memoxClient.resolveSourceIdentity({
      sourceType: stableIdentity.sourceType,
      externalId: stableIdentity.externalId,
      body: stableIdentity.body,
      idempotencyKey: idempotency.sourceIdentity,
      requestId: params.eventId,
    });
    this.telemetryService.recordIdentityResolve();

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
    return {
      disposition: WorkspaceContentOutboxResultDisposition.INDEXED,
    };
  }

  async deleteDocument(
    params: MemoxWorkspaceContentDeleteInput,
  ): Promise<MemoxWorkspaceContentProjectionResult> {
    this.telemetryService.recordDeleteRequest();
    const idempotency = this.bridgeService.buildLifecycleIdempotencyFamily(
      `workspace-content-delete:${params.workspaceId}:${params.documentId}`,
    );
    const activeRevisionId = await this.getActiveRevisionId(
      params.workspaceId,
      params.documentId,
    );
    if (activeRevisionId) {
      return { disposition: null };
    }
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

    return {
      disposition: WorkspaceContentOutboxResultDisposition.DELETED,
    };
  }

  private async deleteExistingSource(
    params: Pick<
      MemoxWorkspaceContentUpsertInput,
      'eventId' | 'userId' | 'workspaceId' | 'documentId'
    >,
    idempotencyKey: string,
  ): Promise<void> {
    const lookup = this.bridgeService.buildSourceIdentityLookupQuery({
      userId: params.userId,
      workspaceId: params.workspaceId,
      documentId: params.documentId,
    });

    try {
      const source = await this.memoxClient.getSourceIdentity({
        sourceType: lookup.sourceType,
        externalId: lookup.externalId,
        query: lookup.query,
        requestId: params.eventId,
      });
      this.telemetryService.recordIdentityLookup();

      await this.memoxClient.deleteSource({
        sourceId: source.source_id,
        idempotencyKey,
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

  private async getActiveRevisionId(
    workspaceId: string,
    documentId: string,
  ): Promise<string | null> {
    const document = await this.prisma.workspaceDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        workspaceId: true,
        currentRevisionId: true,
      },
    });

    if (!document || document.workspaceId !== workspaceId) {
      return null;
    }

    return document.currentRevisionId;
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

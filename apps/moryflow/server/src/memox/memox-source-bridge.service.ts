import { Injectable } from '@nestjs/common';
import type {
  MemoxCreateSourceRevisionBody,
  MemoxSourceIdentityBody,
  MemoxSourceSearchItem,
  MemoxSourceSearchRequest,
} from './dto/memox.dto';

export interface MemoxLifecycleIdempotencyFamily {
  sourceIdentity: string;
  sourceIdentityMaterialize: string;
  revisionCreate: string;
  revisionFinalize: string;
  sourceDelete: string;
}

export interface MemoxSearchFileResult {
  fileId: string;
  vaultId: string | null;
  title: string;
  path: string | null;
  snippet: string;
  score: number;
}

@Injectable()
export class MemoxSourceBridgeService {
  buildSourceIdentityLookupInput(params: {
    userId: string;
    vaultId: string;
    fileId: string;
  }): {
    sourceType: string;
    externalId: string;
    body: Pick<MemoxSourceIdentityBody, 'user_id' | 'project_id'>;
  } {
    return {
      sourceType: 'note_markdown',
      externalId: params.fileId,
      body: {
        user_id: params.userId,
        project_id: params.vaultId,
      },
    };
  }

  buildSourceIdentityInput(
    params: {
      userId: string;
      vaultId: string;
      fileId: string;
      title: string;
      displayPath: string;
      mimeType?: string;
      contentHash: string;
      storageRevision: string;
    },
    options?: {
      includeLifecycleMetadata?: boolean;
    },
  ): {
    sourceType: string;
    externalId: string;
    body: MemoxSourceIdentityBody;
  } {
    const includeLifecycleMetadata = options?.includeLifecycleMetadata ?? true;

    return {
      sourceType: 'note_markdown',
      externalId: params.fileId,
      body: {
        title: params.title,
        user_id: params.userId,
        project_id: params.vaultId,
        display_path: params.displayPath,
        mime_type: params.mimeType,
        metadata: {
          source_origin: 'moryflow_sync',
          ...(includeLifecycleMetadata
            ? {
                content_hash: params.contentHash,
                storage_revision: params.storageRevision,
              }
            : {}),
        },
      },
    };
  }

  buildSourcesSearchRequest(params: {
    userId: string;
    query: string;
    topK: number;
    vaultId?: string;
  }): MemoxSourceSearchRequest {
    return {
      query: params.query,
      top_k: params.topK,
      include_graph_context: false,
      user_id: params.userId,
      ...(params.vaultId ? { project_id: params.vaultId } : {}),
    };
  }

  buildInlineRevisionBody(params: {
    content: string;
    mimeType?: string;
  }): MemoxCreateSourceRevisionBody {
    return {
      mode: 'inline_text',
      content: params.content,
      ...(params.mimeType ? { mime_type: params.mimeType } : {}),
    };
  }

  mapSearchItemToFileResult(
    item: MemoxSourceSearchItem,
  ): MemoxSearchFileResult {
    if (!item.external_id) {
      throw new Error('Memox source result missing external_id');
    }

    return {
      fileId: item.external_id,
      vaultId: item.project_id,
      title: item.title,
      path: item.display_path,
      snippet: item.snippet,
      score: item.score,
    };
  }

  buildLifecycleIdempotencyFamily(
    rootKey: string,
  ): MemoxLifecycleIdempotencyFamily {
    return {
      sourceIdentity: `${rootKey}:source-identity`,
      sourceIdentityMaterialize: `${rootKey}:source-identity-materialize`,
      revisionCreate: `${rootKey}:revision-create`,
      revisionFinalize: `${rootKey}:revision-finalize`,
      sourceDelete: `${rootKey}:source-delete`,
    };
  }
}

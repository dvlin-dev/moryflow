import { Injectable } from '@nestjs/common';
import type {
  MemoxCreateSourceRevisionBody,
  MemoxSourceIdentityBody,
  MemoxSourceSearchItem,
  MemoxSourceSearchRequest,
} from './dto/memox.dto';
import { MORYFLOW_WORKSPACE_MARKDOWN_SOURCE_TYPE } from './memox-source-contract';

export interface MemoxLifecycleIdempotencyFamily {
  sourceIdentity: string;
  sourceIdentityMaterialize: string;
  revisionCreate: string;
  revisionFinalize: string;
  sourceDelete: string;
}

export interface MemoxSearchDocumentResult {
  documentId: string;
  workspaceId: string | null;
  title: string;
  path: string | null;
  snippet: string;
  score: number;
}

@Injectable()
export class MemoxSourceBridgeService {
  buildSourceIdentityLookupInput(params: {
    userId: string;
    workspaceId: string;
    documentId: string;
  }): {
    sourceType: string;
    externalId: string;
    body: Pick<MemoxSourceIdentityBody, 'user_id' | 'project_id'>;
  } {
    return {
      sourceType: MORYFLOW_WORKSPACE_MARKDOWN_SOURCE_TYPE,
      externalId: params.documentId,
      body: {
        user_id: params.userId,
        project_id: params.workspaceId,
      },
    };
  }

  buildSourceIdentityInput(
    params: {
      userId: string;
      workspaceId: string;
      documentId: string;
      title: string;
      displayPath: string;
      mimeType?: string;
      contentHash: string;
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
      sourceType: MORYFLOW_WORKSPACE_MARKDOWN_SOURCE_TYPE,
      externalId: params.documentId,
      body: {
        title: params.title,
        user_id: params.userId,
        project_id: params.workspaceId,
        display_path: params.displayPath,
        mime_type: params.mimeType,
        metadata: {
          source_origin: 'moryflow_workspace_content',
          ...(includeLifecycleMetadata
            ? {
                content_hash: params.contentHash,
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
    workspaceId?: string;
  }): MemoxSourceSearchRequest {
    return {
      query: params.query,
      top_k: params.topK,
      include_graph_context: false,
      source_types: [MORYFLOW_WORKSPACE_MARKDOWN_SOURCE_TYPE],
      user_id: params.userId,
      ...(params.workspaceId ? { project_id: params.workspaceId } : {}),
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
  ): MemoxSearchDocumentResult {
    if (!item.external_id) {
      throw new Error('Memox source result missing external_id');
    }

    return {
      documentId: item.external_id,
      workspaceId: item.project_id,
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

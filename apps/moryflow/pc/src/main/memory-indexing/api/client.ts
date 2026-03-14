import { membershipBridge } from '../../membership-bridge.js';
import {
  createApiClient,
  createApiTransport,
  ServerApiError,
  type ApiClientRequestOptions,
} from '@moryflow/api/client';

export interface WorkspaceContentInlineTextDocument {
  documentId: string;
  path: string;
  title: string;
  mimeType?: string;
  contentHash: string;
  contentBytes?: number;
  mode: 'inline_text';
  contentText: string;
}

export interface WorkspaceContentSyncObjectRefDocument {
  documentId: string;
  path: string;
  title: string;
  mimeType?: string;
  contentHash: string;
  mode: 'sync_object_ref';
  vaultId: string;
  fileId: string;
  storageRevision: string;
}

export type WorkspaceContentDocument =
  | WorkspaceContentInlineTextDocument
  | WorkspaceContentSyncObjectRefDocument;

export interface WorkspaceContentBatchUpsertInput {
  workspaceId: string;
  documents: WorkspaceContentDocument[];
}

export interface WorkspaceContentBatchUpsertResponse {
  workspaceId: string;
  processedCount: number;
  revisionCreatedCount: number;
}

export interface WorkspaceContentDeleteDocument {
  documentId: string;
}

export interface WorkspaceContentBatchDeleteInput {
  workspaceId: string;
  documents: WorkspaceContentDeleteDocument[];
}

export interface WorkspaceContentBatchDeleteResponse {
  workspaceId: string;
  processedCount: number;
  deletedCount: number;
}

export class WorkspaceContentApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'WorkspaceContentApiError';
  }
}

const getAuthedClient = () => {
  const config = membershipBridge.getConfig();
  if (!config.token) {
    throw new WorkspaceContentApiError('Please log in first', 401, 'UNAUTHORIZED');
  }

  return createApiClient({
    transport: createApiTransport({
      baseUrl: config.apiUrl,
    }),
    defaultAuthMode: 'bearer',
    getAccessToken: () => config.token,
  });
};

const request = async <T>(path: string, body: unknown): Promise<T> => {
  const client = getAuthedClient();

  try {
    return await client.post<T>(path, {
      body: body as ApiClientRequestOptions['body'],
    });
  } catch (error) {
    if (error instanceof ServerApiError) {
      throw new WorkspaceContentApiError(error.message, error.status, error.code);
    }
    throw new WorkspaceContentApiError('Request failed', 500, 'UNKNOWN_ERROR');
  }
};

export const workspaceContentApi = {
  batchUpsert: (
    input: WorkspaceContentBatchUpsertInput,
  ): Promise<WorkspaceContentBatchUpsertResponse> =>
    request('/api/v1/workspace-content/batch-upsert', input),
  batchDelete: (
    input: WorkspaceContentBatchDeleteInput,
  ): Promise<WorkspaceContentBatchDeleteResponse> =>
    request('/api/v1/workspace-content/batch-delete', input),
} as const;

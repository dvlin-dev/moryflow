import { membershipBridge } from '../../membership/bridge.js';
import {
  createApiClient,
  createApiTransport,
  ServerApiError,
  type ApiClientRequestOptions,
} from '@moryflow/api/client';

export interface WorkspaceResolveInput {
  clientWorkspaceId: string;
  name: string;
  syncRequested?: boolean;
}

export interface WorkspaceResolveResult {
  workspaceId: string;
  memoryProjectId: string;
  syncVaultId: string | null;
  syncEnabled: boolean;
}

export class WorkspaceProfileApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'WorkspaceProfileApiError';
  }
}

const getAuthedClient = () => {
  const config = membershipBridge.getConfig();
  if (!config.token) {
    throw new WorkspaceProfileApiError('Please log in first', 401, 'UNAUTHORIZED');
  }

  return createApiClient({
    transport: createApiTransport({
      baseUrl: config.apiUrl,
    }),
    defaultAuthMode: 'bearer',
    getAccessToken: () => config.token,
  });
};

const request = async <T>(path: string, body?: unknown): Promise<T> => {
  const client = getAuthedClient();
  const requestBody = body as ApiClientRequestOptions['body'];

  try {
    return await client.post<T>(path, { body: requestBody });
  } catch (error) {
    if (error instanceof ServerApiError) {
      throw new WorkspaceProfileApiError(error.message, error.status, error.code);
    }
    throw new WorkspaceProfileApiError('Request failed', 500, 'UNKNOWN_ERROR');
  }
};

export const workspaceProfileApi = {
  resolveWorkspace: (input: WorkspaceResolveInput): Promise<WorkspaceResolveResult> =>
    request('/api/v1/workspaces/resolve', input),
} as const;

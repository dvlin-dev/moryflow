import { membershipBridge } from '../../membership/bridge.js';
import {
  createApiClient,
  createApiTransport,
  ServerApiError,
  type ApiClientRequestOptions,
} from '@moryflow/api/client';
import type {
  MemoryCreateFactInput,
  MemoryEntityDetailInput,
  MemoryEntityDetail,
  MemoryExportResult,
  MemoryFactHistory,
  MemoryFeedbackInput,
  MemoryFeedbackResult,
  MemoryGatewayOverview,
  MemoryGraphQueryInput,
  MemoryGraphQueryResult,
  MemoryListFactsInput,
  MemorySearchInput,
  MemoryUpdateFactInput,
  MemoryBatchUpdateFactsInput,
  MemoryBatchDeleteFactsInput,
} from '../../../shared/ipc/memory.js';

/** Raw fact from server — does not include PC-enriched fields (factScope, sourceType). */
export interface ServerMemoryFact {
  id: string;
  text: string;
  kind: 'manual' | 'source-derived';
  readOnly: boolean;
  metadata: Record<string, unknown> | null;
  categories: string[];
  sourceId: string | null;
  sourceRevisionId: string | null;
  derivedKey: string | null;
  expirationDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Raw search fact item from server — does not include PC-enriched fields. */
export interface ServerMemorySearchFactItem {
  id: string;
  text: string;
  kind: 'manual' | 'source-derived';
  readOnly: boolean;
  metadata: Record<string, unknown> | null;
  score: number;
  sourceId: string | null;
}

export interface MemoryServerScope {
  workspaceId: string;
  projectId: string;
  syncVaultId: string | null;
}

export interface MemoryServerOverview {
  scope: MemoryServerScope;
  indexing: MemoryGatewayOverview['indexing'];
  facts: MemoryGatewayOverview['facts'];
  graph: MemoryGatewayOverview['graph'];
}

export interface MemoryServerSearchFileItem {
  id: string;
  documentId: string;
  workspaceId: string | null;
  sourceId: string;
  title: string;
  path: string | null;
  snippet: string;
  score: number;
}

export interface MemoryServerSearchResult {
  scope: MemoryServerScope;
  query: string;
  groups: {
    files: {
      items: MemoryServerSearchFileItem[];
      returnedCount: number;
      hasMore: boolean;
    };
    facts: {
      items: ServerMemorySearchFactItem[];
      returnedCount: number;
      hasMore: boolean;
    };
  };
}

export interface MemoryServerListFactsResult {
  scope: MemoryServerScope;
  page: number;
  pageSize: number;
  hasMore: boolean;
  items: ServerMemoryFact[];
}

export interface MemoryServerFactHistory {
  scope: MemoryServerScope;
  items: MemoryFactHistory['items'];
}

export interface MemoryServerGraphQueryResult extends Omit<MemoryGraphQueryResult, 'scope'> {
  scope: MemoryServerScope;
}

export interface MemoryServerExportData {
  scope: MemoryServerScope;
  items: ServerMemoryFact[];
}

export class MemoryApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'MemoryApiError';
  }
}

const getAuthedClient = () => {
  const config = membershipBridge.getConfig();
  if (!config.token) {
    throw new MemoryApiError('Please log in first', 401, 'UNAUTHORIZED');
  }

  return createApiClient({
    transport: createApiTransport({
      baseUrl: config.apiUrl,
    }),
    defaultAuthMode: 'bearer',
    getAccessToken: () => config.token,
  });
};

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const request = async <T>(
  path: string,
  options: { method?: RequestMethod; body?: unknown } = {}
): Promise<T> => {
  const client = getAuthedClient();
  const method = options.method ?? 'GET';
  const body = options.body as ApiClientRequestOptions['body'];

  try {
    switch (method) {
      case 'POST':
        return await client.post<T>(path, { body });
      case 'PUT':
        return await client.put<T>(path, { body });
      case 'PATCH':
        return await client.patch<T>(path, { body });
      case 'DELETE':
        return await client.del<T>(path, { body });
      default:
        return await client.get<T>(path);
    }
  } catch (error) {
    if (error instanceof ServerApiError) {
      throw new MemoryApiError(error.message, error.status, error.code);
    }
    throw new MemoryApiError('Request failed', 500, 'UNKNOWN_ERROR');
  }
};

const toQueryString = (params: Record<string, unknown>) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, String(entry)));
      continue;
    }
    query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded.length > 0 ? `?${encoded}` : '';
};

export const memoryApi = {
  getOverview: (input: { workspaceId: string }): Promise<MemoryServerOverview> =>
    request(`/api/v1/memory/overview${toQueryString(input)}`),

  search: (input: MemorySearchInput & { workspaceId: string }): Promise<MemoryServerSearchResult> =>
    request('/api/v1/memory/search', {
      method: 'POST',
      body: input,
    }),

  listFacts: (
    input: MemoryListFactsInput & { workspaceId: string }
  ): Promise<MemoryServerListFactsResult> =>
    request('/api/v1/memory/facts/query', {
      method: 'POST',
      body: input,
    }),

  getFactDetail: (input: { workspaceId: string; factId: string }): Promise<ServerMemoryFact> =>
    request(
      `/api/v1/memory/facts/${encodeURIComponent(input.factId)}${toQueryString({
        workspaceId: input.workspaceId,
      })}`
    ),

  createFact: (input: MemoryCreateFactInput & { workspaceId: string }): Promise<ServerMemoryFact> =>
    request('/api/v1/memory/facts', {
      method: 'POST',
      body: input,
    }),

  updateFact: (input: MemoryUpdateFactInput & { workspaceId: string }): Promise<ServerMemoryFact> =>
    request(`/api/v1/memory/facts/${encodeURIComponent(input.factId)}`, {
      method: 'PUT',
      body: input,
    }),

  deleteFact: (input: { workspaceId: string; factId: string }): Promise<void> =>
    request(
      `/api/v1/memory/facts/${encodeURIComponent(input.factId)}${toQueryString({
        workspaceId: input.workspaceId,
      })}`,
      {
        method: 'DELETE',
      }
    ),

  batchUpdateFacts: (
    input: MemoryBatchUpdateFactsInput & { workspaceId: string }
  ): Promise<{ updatedCount: number }> =>
    request('/api/v1/memory/facts/batch-update', {
      method: 'POST',
      body: input,
    }),

  batchDeleteFacts: (
    input: MemoryBatchDeleteFactsInput & { workspaceId: string }
  ): Promise<{ deletedCount: number }> =>
    request('/api/v1/memory/facts/batch-delete', {
      method: 'POST',
      body: input,
    }),

  getFactHistory: (input: {
    workspaceId: string;
    factId: string;
  }): Promise<MemoryServerFactHistory> =>
    request(
      `/api/v1/memory/facts/${encodeURIComponent(input.factId)}/history${toQueryString({
        workspaceId: input.workspaceId,
      })}`
    ),

  feedbackFact: (
    input: MemoryFeedbackInput & { workspaceId: string }
  ): Promise<MemoryFeedbackResult> =>
    request(`/api/v1/memory/facts/${encodeURIComponent(input.factId)}/feedback`, {
      method: 'POST',
      body: input,
    }),

  queryGraph: (
    input: MemoryGraphQueryInput & { workspaceId: string }
  ): Promise<MemoryServerGraphQueryResult> =>
    request('/api/v1/memory/graph/query', {
      method: 'POST',
      body: input,
    }),

  getEntityDetail: (
    input: MemoryEntityDetailInput & { workspaceId: string }
  ): Promise<MemoryEntityDetail> =>
    request(`/api/v1/memory/graph/entities/${encodeURIComponent(input.entityId)}/detail`, {
      method: 'POST',
      body: {
        workspaceId: input.workspaceId,
      },
    }),

  createExport: (input: { workspaceId: string }): Promise<MemoryExportResult> =>
    request('/api/v1/memory/exports', {
      method: 'POST',
      body: input,
    }),

  getExport: (input: { workspaceId: string; exportId: string }): Promise<MemoryServerExportData> =>
    request('/api/v1/memory/exports/get', {
      method: 'POST',
      body: input,
    }),
} as const;

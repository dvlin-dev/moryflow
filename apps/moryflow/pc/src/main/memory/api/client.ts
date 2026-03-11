import { membershipBridge } from '../../membership-bridge.js';
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
  MemoryExportData,
  MemoryExportResult,
  MemoryFact,
  MemoryFactHistory,
  MemoryFeedbackInput,
  MemoryFeedbackResult,
  MemoryGatewayOverview,
  MemoryGraphQueryInput,
  MemoryGraphQueryResult,
  MemoryListFactsInput,
  MemoryListFactsResult,
  MemorySearchInput,
  MemorySearchResult,
  MemoryUpdateFactInput,
  MemoryBatchUpdateFactsInput,
  MemoryBatchDeleteFactsInput,
} from '../../../shared/ipc/memory.js';

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
  getOverview: (input: { vaultId: string }): Promise<MemoryGatewayOverview> =>
    request(`/api/v1/memory/overview${toQueryString(input)}`),

  search: (input: MemorySearchInput & { vaultId: string }): Promise<MemorySearchResult> =>
    request('/api/v1/memory/search', {
      method: 'POST',
      body: input,
    }),

  listFacts: (input: MemoryListFactsInput & { vaultId: string }): Promise<MemoryListFactsResult> =>
    request('/api/v1/memory/facts/query', {
      method: 'POST',
      body: input,
    }),

  getFactDetail: (input: { vaultId: string; factId: string }): Promise<MemoryFact> =>
    request(
      `/api/v1/memory/facts/${encodeURIComponent(input.factId)}${toQueryString({
        vaultId: input.vaultId,
      })}`
    ),

  createFact: (input: MemoryCreateFactInput & { vaultId: string }): Promise<MemoryFact> =>
    request('/api/v1/memory/facts', {
      method: 'POST',
      body: input,
    }),

  updateFact: (input: MemoryUpdateFactInput & { vaultId: string }): Promise<MemoryFact> =>
    request(`/api/v1/memory/facts/${encodeURIComponent(input.factId)}`, {
      method: 'PUT',
      body: input,
    }),

  deleteFact: (input: { vaultId: string; factId: string }): Promise<void> =>
    request(
      `/api/v1/memory/facts/${encodeURIComponent(input.factId)}${toQueryString({
        vaultId: input.vaultId,
      })}`,
      {
        method: 'DELETE',
      }
    ),

  batchUpdateFacts: (
    input: MemoryBatchUpdateFactsInput & { vaultId: string }
  ): Promise<{ updatedCount: number }> =>
    request('/api/v1/memory/facts/batch-update', {
      method: 'POST',
      body: input,
    }),

  batchDeleteFacts: (
    input: MemoryBatchDeleteFactsInput & { vaultId: string }
  ): Promise<{ deletedCount: number }> =>
    request('/api/v1/memory/facts/batch-delete', {
      method: 'POST',
      body: input,
    }),

  getFactHistory: (input: { vaultId: string; factId: string }): Promise<MemoryFactHistory> =>
    request(
      `/api/v1/memory/facts/${encodeURIComponent(input.factId)}/history${toQueryString({
        vaultId: input.vaultId,
      })}`
    ),

  feedbackFact: (input: MemoryFeedbackInput & { vaultId: string }): Promise<MemoryFeedbackResult> =>
    request(`/api/v1/memory/facts/${encodeURIComponent(input.factId)}/feedback`, {
      method: 'POST',
      body: input,
    }),

  queryGraph: (
    input: MemoryGraphQueryInput & { vaultId: string }
  ): Promise<MemoryGraphQueryResult> =>
    request('/api/v1/memory/graph/query', {
      method: 'POST',
      body: input,
    }),

  getEntityDetail: (
    input: MemoryEntityDetailInput & { vaultId: string }
  ): Promise<MemoryEntityDetail> =>
    request(`/api/v1/memory/graph/entities/${encodeURIComponent(input.entityId)}/detail`, {
      method: 'POST',
      body: {
        vaultId: input.vaultId,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    }),

  createExport: (input: { vaultId: string }): Promise<MemoryExportResult> =>
    request('/api/v1/memory/exports', {
      method: 'POST',
      body: input,
    }),

  getExport: (input: { vaultId: string; exportId: string }): Promise<MemoryExportData> =>
    request('/api/v1/memory/exports/get', {
      method: 'POST',
      body: input,
    }),
} as const;

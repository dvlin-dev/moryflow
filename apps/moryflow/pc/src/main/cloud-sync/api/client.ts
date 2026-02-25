/**
 * Cloud Sync - HTTP 客户端
 * 单一职责：HTTP 请求（纯函数），不含业务逻辑
 */

import { membershipBridge } from '../../membership-bridge.js';
import { createLogger } from '../logger.js';
import {
  createApiClient,
  createApiTransport,
  ServerApiError,
  type ApiClientRequestOptions,
} from '@moryflow/api/client';
import type {
  VaultDto,
  VaultListDto,
  VaultDeviceDto,
  SyncDiffRequest,
  SyncDiffResponse,
  SyncCommitRequest,
  SyncCommitResponse,
  VectorizeFileRequest,
  VectorizeResponse,
  VectorizeStatusResponse,
  SearchRequest,
  SearchResponse,
  UsageResponse,
} from './types.js';

const log = createLogger('api');

// ── HTTP 错误类型 ───────────────────────────────────────────

export class CloudSyncApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'CloudSyncApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isQuotaExceeded(): boolean {
    return this.status === 403;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

// ── 基础请求函数 ────────────────────────────────────────────

const getAuthedClient = () => {
  const config = membershipBridge.getConfig();
  if (!config.token) {
    throw new CloudSyncApiError('Please log in first', 401, 'UNAUTHORIZED');
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
      log.error(`${path} failed:`, error.status, error.message);
      throw new CloudSyncApiError(error.message, error.status, error.code);
    }

    log.error(`${path} failed with unknown error:`, error);
    throw new CloudSyncApiError('Request failed', 500, 'UNKNOWN_ERROR');
  }
};

// ── API 方法（纯函数）────────────────────────────────────────

export const cloudSyncApi = {
  // ── Vault ─────────────────────────────────────────────────

  listVaults: (): Promise<VaultListDto> => request('/api/v1/vaults'),

  createVault: (name: string): Promise<VaultDto> =>
    request('/api/v1/vaults', {
      method: 'POST',
      body: { name },
    }),

  getVault: (vaultId: string): Promise<VaultDto> => request(`/api/v1/vaults/${vaultId}`),

  deleteVault: (vaultId: string): Promise<void> =>
    request(`/api/v1/vaults/${vaultId}`, { method: 'DELETE' }),

  registerDevice: (
    vaultId: string,
    deviceId: string,
    deviceName: string
  ): Promise<VaultDeviceDto> =>
    request(`/api/v1/vaults/${vaultId}/devices`, {
      method: 'POST',
      body: { deviceId, deviceName },
    }),

  // ── Sync ──────────────────────────────────────────────────

  syncDiff: (payload: SyncDiffRequest): Promise<SyncDiffResponse> =>
    request('/api/v1/sync/diff', {
      method: 'POST',
      body: payload,
    }),

  syncCommit: (payload: SyncCommitRequest): Promise<SyncCommitResponse> =>
    request('/api/v1/sync/commit', {
      method: 'POST',
      body: payload,
    }),

  // ── Vectorize ─────────────────────────────────────────────

  vectorizeFile: (payload: VectorizeFileRequest): Promise<VectorizeResponse> =>
    request('/api/v1/vectorize/file', {
      method: 'POST',
      body: payload,
    }),

  deleteVector: (fileId: string): Promise<void> =>
    request(`/api/v1/vectorize/file/${fileId}`, { method: 'DELETE' }),

  getVectorizeStatus: (fileId: string): Promise<VectorizeStatusResponse> =>
    request(`/api/v1/vectorize/status/${fileId}`),

  // ── Search ────────────────────────────────────────────────

  search: (payload: SearchRequest): Promise<SearchResponse> =>
    request('/api/v1/search', {
      method: 'POST',
      body: payload,
    }),

  // ── Usage ─────────────────────────────────────────────────

  getUsage: (): Promise<UsageResponse> => request('/api/v1/usage'),
} as const;

/**
 * [INPUT]: token (via getAccessToken), API payload
 * [OUTPUT]: API response DTOs
 * [POS]: Cloud Sync HTTP 客户端，单一职责：HTTP 请求
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { MEMBERSHIP_API_URL } from '@moryflow/api';
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
} from '@moryflow/api/cloud-sync';
import { getAccessToken, refreshAccessToken } from '@/lib/server/auth-session';
import { FETCH_TIMEOUT } from './const';

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

interface RequestConfig extends RequestInit {
  /** 使用完整 URL（用于预签名 URL），跳过 baseUrl 和鉴权 */
  fullUrl?: string;
  /** 返回原始 Response 而非 JSON */
  raw?: boolean;
}

const authedClient = createApiClient({
  transport: createApiTransport({
    baseUrl: MEMBERSHIP_API_URL,
    timeoutMs: FETCH_TIMEOUT,
  }),
  defaultAuthMode: 'bearer',
  getAccessToken,
  onUnauthorized: refreshAccessToken,
});

const publicTransport = createApiTransport({
  baseUrl: 'http://localhost',
  timeoutMs: FETCH_TIMEOUT,
});

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const request = async <T>(path: string, options: RequestConfig = {}): Promise<T> => {
  const { fullUrl, raw, ...fetchOptions } = options;
  const method = (fetchOptions.method?.toUpperCase() ?? 'GET') as RequestMethod;
  const body = fetchOptions.body as ApiClientRequestOptions['body'];

  try {
    if (fullUrl) {
      return await publicTransport.request<T>({
        path: fullUrl,
        method,
        headers: fetchOptions.headers,
        body,
        signal: fetchOptions.signal ?? undefined,
        responseType: raw ? 'raw' : 'json',
      });
    }

    switch (method) {
      case 'POST':
        return await authedClient.post<T>(path, {
          headers: fetchOptions.headers,
          body,
          signal: fetchOptions.signal ?? undefined,
        });
      case 'PUT':
        return await authedClient.put<T>(path, {
          headers: fetchOptions.headers,
          body,
          signal: fetchOptions.signal ?? undefined,
        });
      case 'PATCH':
        return await authedClient.patch<T>(path, {
          headers: fetchOptions.headers,
          body,
          signal: fetchOptions.signal ?? undefined,
        });
      case 'DELETE':
        return await authedClient.del<T>(path, {
          headers: fetchOptions.headers,
          body,
          signal: fetchOptions.signal ?? undefined,
        });
      default:
        if (raw) {
          return (await authedClient.raw(path, {
            headers: fetchOptions.headers,
            signal: fetchOptions.signal ?? undefined,
          })) as T;
        }
        return await authedClient.get<T>(path, {
          headers: fetchOptions.headers,
          signal: fetchOptions.signal ?? undefined,
        });
    }
  } catch (error) {
    if (error instanceof ServerApiError) {
      console.error(`[CloudSync] ${fullUrl || path} failed:`, error.status, error.message);
      throw new CloudSyncApiError(error.message, error.status, error.code);
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CloudSyncApiError('Request timeout', 408, 'TIMEOUT');
    }
    throw new CloudSyncApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      'NETWORK_ERROR'
    );
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

  // ── File Operations（预签名 URL）─────────────────────────────

  /** 上传文件到预签名 URL */
  uploadFile: async (url: string, content: Uint8Array): Promise<void> => {
    await request<Response>('', {
      fullUrl: url,
      method: 'PUT',
      body: content.buffer as ArrayBuffer,
      headers: { 'Content-Type': 'application/octet-stream' },
      raw: true,
    });
  },

  /** 从预签名 URL 下载文件 */
  downloadFile: async (url: string): Promise<string> => {
    const res = await request<Response>('', { fullUrl: url, raw: true });
    return res.text();
  },
} as const;

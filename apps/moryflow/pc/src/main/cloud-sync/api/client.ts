/**
 * Cloud Sync - HTTP 客户端
 * 单一职责：HTTP 请求（纯函数），不含业务逻辑
 */

import { membershipBridge } from '../../membership-bridge.js';
import { createLogger } from '../logger.js';
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

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const config = membershipBridge.getConfig();
  if (!config.token) {
    throw new CloudSyncApiError('Please log in first', 401, 'UNAUTHORIZED');
  }

  const res = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    let error: { message?: string; code?: string } = { message: `Request failed: ${res.status}` };
    try {
      if (errorText) {
        error = JSON.parse(errorText);
      }
    } catch {
      // If not JSON, use raw text
      error.message = errorText || `Request failed: ${res.status}`;
    }
    log.error(`${path} failed:`, res.status, errorText);
    throw new CloudSyncApiError(
      error.message || `Request failed: ${res.status}`,
      res.status,
      error.code
    );
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
};

// ── API 方法（纯函数）────────────────────────────────────────

export const cloudSyncApi = {
  // ── Vault ─────────────────────────────────────────────────

  listVaults: (): Promise<VaultListDto> => request('/api/vaults'),

  createVault: (name: string): Promise<VaultDto> =>
    request('/api/vaults', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  getVault: (vaultId: string): Promise<VaultDto> => request(`/api/vaults/${vaultId}`),

  deleteVault: (vaultId: string): Promise<void> =>
    request(`/api/vaults/${vaultId}`, { method: 'DELETE' }),

  registerDevice: (
    vaultId: string,
    deviceId: string,
    deviceName: string
  ): Promise<VaultDeviceDto> =>
    request(`/api/vaults/${vaultId}/devices`, {
      method: 'POST',
      body: JSON.stringify({ deviceId, deviceName }),
    }),

  // ── Sync ──────────────────────────────────────────────────

  syncDiff: (payload: SyncDiffRequest): Promise<SyncDiffResponse> =>
    request('/api/sync/diff', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  syncCommit: (payload: SyncCommitRequest): Promise<SyncCommitResponse> =>
    request('/api/sync/commit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // ── Vectorize ─────────────────────────────────────────────

  vectorizeFile: (payload: VectorizeFileRequest): Promise<VectorizeResponse> =>
    request('/api/vectorize/file', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteVector: (fileId: string): Promise<void> =>
    request(`/api/vectorize/file/${fileId}`, { method: 'DELETE' }),

  getVectorizeStatus: (fileId: string): Promise<VectorizeStatusResponse> =>
    request(`/api/vectorize/status/${fileId}`),

  // ── Search ────────────────────────────────────────────────

  search: (payload: SearchRequest): Promise<SearchResponse> =>
    request('/api/search', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // ── Usage ─────────────────────────────────────────────────

  getUsage: (): Promise<UsageResponse> => request('/api/usage'),
} as const;

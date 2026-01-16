/**
 * [INPUT]: token (via getStoredToken), API payload
 * [OUTPUT]: API response DTOs
 * [POS]: Cloud Sync HTTP 客户端，单一职责：HTTP 请求
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { MEMBERSHIP_API_URL } from '@anyhunt/api'
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
} from '@anyhunt/api/cloud-sync'
import { getStoredToken } from '@/lib/server/storage'
import { FETCH_TIMEOUT } from './const'

// ── HTTP 错误类型 ───────────────────────────────────────────

export class CloudSyncApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'CloudSyncApiError'
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isQuotaExceeded(): boolean {
    return this.status === 403
  }

  get isServerError(): boolean {
    return this.status >= 500
  }
}

// ── 基础请求函数 ────────────────────────────────────────────

interface RequestConfig extends RequestInit {
  /** 使用完整 URL（用于预签名 URL），跳过 baseUrl 和鉴权 */
  fullUrl?: string
  /** 返回原始 Response 而非 JSON */
  raw?: boolean
}

const request = async <T>(
  path: string,
  options: RequestConfig = {}
): Promise<T> => {
  const { fullUrl, raw, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

  try {
    let url: string
    let headers: HeadersInit

    if (fullUrl) {
      // 预签名 URL：不需要鉴权
      url = fullUrl
      headers = { ...fetchOptions.headers }
    } else {
      // API 请求：需要鉴权
      const token = await getStoredToken()
      if (!token) {
        throw new CloudSyncApiError('Please log in first', 401, 'UNAUTHORIZED')
      }
      url = `${MEMBERSHIP_API_URL}${path}`
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...fetchOptions.headers,
      }
    }

    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers,
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      let error: { message?: string; code?: string } = { message: `Request failed: ${res.status}` }
      try {
        if (errorText) {
          error = JSON.parse(errorText)
        }
      } catch {
        error.message = errorText || `Request failed: ${res.status}`
      }
      console.error(`[CloudSync] ${fullUrl || path} failed:`, res.status, errorText)
      throw new CloudSyncApiError(
        error.message || `Request failed: ${res.status}`,
        res.status,
        error.code
      )
    }

    // 返回原始 Response
    if (raw) {
      return res as unknown as T
    }

    // 204 No Content
    if (res.status === 204) {
      return undefined as T
    }

    return res.json()
  } catch (err) {
    if (err instanceof CloudSyncApiError) {
      throw err
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new CloudSyncApiError('Request timeout', 408, 'TIMEOUT')
    }
    throw new CloudSyncApiError(
      err instanceof Error ? err.message : 'Network error',
      0,
      'NETWORK_ERROR'
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

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

  registerDevice: (vaultId: string, deviceId: string, deviceName: string): Promise<VaultDeviceDto> =>
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

  deleteVector: (fileId: string): Promise<{ success: boolean }> =>
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

  // ── File Operations（预签名 URL）─────────────────────────────

  /** 上传文件到预签名 URL */
  uploadFile: async (url: string, content: Uint8Array): Promise<void> => {
    await request<Response>('', {
      fullUrl: url,
      method: 'PUT',
      body: content.buffer as ArrayBuffer,
      headers: { 'Content-Type': 'application/octet-stream' },
      raw: true,
    })
  },

  /** 从预签名 URL 下载文件 */
  downloadFile: async (url: string): Promise<string> => {
    const res = await request<Response>('', { fullUrl: url, raw: true })
    return res.text()
  },
} as const

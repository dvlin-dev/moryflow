/**
 * [PROVIDES]: apiClient, ApiError, API_BASE_URL
 * [DEPENDS]: @memai/shared-types, stores/auth
 * [POS]: Centralized API client with Bearer token auth, error handling, response unwrapping
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and apps/console/CLAUDE.md
 */
import { useAuthStore, getAuthToken } from '../stores/auth'
import type { PaginationMeta, ApiErrorResponse as ApiErrorResponseType } from '@memai/shared-types'

// 开发环境使用空字符串走 Vite 代理，生产环境使用完整 URL
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

/**
 * API 错误类
 * 用于统一处理 API 请求错误
 */
export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }

  /** 是否为认证错误 */
  get isUnauthorized(): boolean {
    return this.status === 401
  }

  /** 是否为权限错误 */
  get isForbidden(): boolean {
    return this.status === 403
  }

  /** 是否为未找到错误 */
  get isNotFound(): boolean {
    return this.status === 404
  }

  /** 是否为服务器错误 */
  get isServerError(): boolean {
    return this.status >= 500
  }
}

/** 分页结果 */
export interface PaginatedResult<T> {
  data: T[]
  meta: PaginationMeta
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  /**
   * 处理响应 - 自动解包 data 字段
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // 处理 204 No Content
    if (response.status === 204) {
      return undefined as T
    }

    // 处理非 JSON 响应
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new ApiError(response.status, 'NETWORK_ERROR', 'Request failed')
      }
      return {} as T
    }

    const json = await response.json()

    // 处理错误响应
    if (!response.ok || json.success === false) {
      // 401/403 自动登出
      if (response.status === 401 || response.status === 403) {
        useAuthStore.getState().logout()
      }

      const errorResponse = json as ApiErrorResponseType
      throw new ApiError(
        response.status,
        errorResponse.error?.code || 'UNKNOWN_ERROR',
        errorResponse.error?.message || `Request failed (${response.status})`
      )
    }

    // 成功响应 - 返回 data 字段
    return json.data
  }

  /**
   * 发送请求
   */
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = getAuthToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    }

    if (token) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    })

    return this.handleResponse<T>(response)
  }

  /**
   * GET 请求
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint)
  }

  /**
   * GET 分页请求 - 返回 data + meta
   * 直接从后端响应中提取分页结构
   */
  async getPaginated<T>(endpoint: string): Promise<PaginatedResult<T>> {
    const token = getAuthToken()
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, { headers })

    // 处理 401/403
    if (response.status === 401 || response.status === 403) {
      useAuthStore.getState().logout()
    }

    const json = await response.json().catch(() => ({}))

    if (!response.ok || json.success === false) {
      const errorResponse = json as ApiErrorResponseType
      throw new ApiError(
        response.status,
        errorResponse.error?.code || 'UNKNOWN_ERROR',
        errorResponse.error?.message || `Request failed (${response.status})`
      )
    }

    return {
      data: json.data,
      meta: json.meta,
    }
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }

  /**
   * GET 请求返回 Blob（用于文件下载）
   */
  async getBlob(endpoint: string): Promise<Blob> {
    const token = getAuthToken()
    const headers: HeadersInit = {}

    if (token) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, { headers })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        useAuthStore.getState().logout()
      }
      throw new ApiError(response.status, 'DOWNLOAD_ERROR', 'Download failed')
    }

    return response.blob()
  }

  /**
   * POST 请求返回 Blob（用于文件下载）
   */
  async postBlob(endpoint: string, data?: unknown): Promise<Blob> {
    const token = getAuthToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (token) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        useAuthStore.getState().logout()
      }
      throw new ApiError(response.status, 'DOWNLOAD_ERROR', 'Download failed')
    }

    return response.blob()
  }
}

// 单例实例
export const apiClient = new ApiClient(API_BASE_URL)

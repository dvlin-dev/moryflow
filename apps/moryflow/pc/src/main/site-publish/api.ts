/**
 * [INPUT]: API endpoint, request options
 * [OUTPUT]: API response
 * [POS]: API 请求工具，封装认证和错误处理
 */

import { membershipBridge } from '../membership-bridge.js'

const API_BASE_URL = process.env.API_BASE_URL || 'https://server.moryflow.com'

/**
 * 发送 API 请求
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const config = membershipBridge.getConfig()
  if (!config.token) {
    throw new Error('Please log in first')
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `API request failed: ${response.status}`)
  }

  // 204 No Content 或空响应体时返回 null
  const contentLength = response.headers.get('content-length')
  if (response.status === 204 || contentLength === '0') {
    return null as T
  }

  return response.json()
}

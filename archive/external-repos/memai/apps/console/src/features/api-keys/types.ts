/**
 * API Keys 类型定义
 */

/** API Key 列表项 */
export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  isActive: boolean
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

/** 创建 API Key 请求 */
export interface CreateApiKeyRequest {
  name: string
  expiresAt?: string
}

/** 创建 API Key 响应 */
export interface CreateApiKeyResponse {
  key: string // 完整密钥，仅在创建时返回
  id: string
  name: string
  keyPrefix: string
}

/** 更新 API Key 请求 */
export interface UpdateApiKeyRequest {
  name?: string
  isActive?: boolean
}

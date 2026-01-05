/**
 * Cloudflare Workers 环境变量类型
 */
export interface Env {
  AI: Ai
  VECTOR_INDEX: VectorizeIndex
  API_SECRET: string
  EMBEDDING_MODEL: string
  VECTOR_DIMENSIONS: string
}

/**
 * Embed 请求参数
 */
export interface EmbedRequest {
  texts: string[]
  type?: 'query' | 'document'
}

/**
 * Embed 响应
 */
export interface EmbedResponse {
  success: true
  data: number[][]
  shape: number[]
}

/**
 * 向量元数据类型
 */
export type VectorMetadata = Record<string, string | number | boolean>

/**
 * Upsert 单条向量参数
 */
export interface UpsertVectorInput {
  id: string
  text: string
  metadata?: VectorMetadata
  namespace?: string
}

/**
 * Upsert 请求参数
 */
export interface UpsertRequest {
  vectors: UpsertVectorInput[]
}

/**
 * Upsert 响应
 */
export interface UpsertResponse {
  success: true
  mutationId: string
  count: number
}

/**
 * Query 请求参数
 */
export interface QueryRequest {
  text: string
  topK?: number
  namespace?: string
  filter?: VectorizeVectorMetadataFilter
}

/**
 * Query 匹配结果
 */
export interface QueryMatch {
  id: string
  score: number
  metadata?: VectorMetadata
}

/**
 * Query 响应
 */
export interface QueryResponse {
  success: true
  matches: QueryMatch[]
  count: number
}

/**
 * Delete 请求参数
 */
export interface DeleteRequest {
  ids: string[]
}

/**
 * Delete 响应
 */
export interface DeleteResponse {
  success: true
  mutationId: string
  count: number
}

/**
 * API 错误响应
 */
export interface ErrorResponse {
  error: string
  details?: string
}

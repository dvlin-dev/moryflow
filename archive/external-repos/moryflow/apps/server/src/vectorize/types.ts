/**
 * 向量元数据类型
 */
export type VectorMetadata = Record<string, string | number | boolean>;

/**
 * Embed 响应
 */
export interface EmbedResponse {
  success: boolean;
  data: number[][];
  shape: number[];
}

/**
 * Upsert 单条向量参数
 */
export interface UpsertVectorInput {
  id: string;
  text: string;
  metadata?: VectorMetadata;
  namespace?: string;
}

/**
 * Upsert 响应
 */
export interface UpsertResponse {
  success: boolean;
  mutationId: string;
  count: number;
}

/**
 * Query 匹配结果
 */
export interface QueryMatch {
  id: string;
  score: number;
  metadata?: VectorMetadata;
}

/**
 * Query 响应
 */
export interface QueryResponse {
  success: boolean;
  matches: QueryMatch[];
  count: number;
}

/**
 * Query 选项
 */
export interface QueryOptions {
  topK?: number;
  namespace?: string;
  filter?: Record<string, unknown>;
}

/**
 * Delete 响应
 */
export interface DeleteResponse {
  success: boolean;
  mutationId: string;
  count: number;
}

/**
 * API 错误响应
 */
export interface ApiErrorResponse {
  error: string;
  details?: string;
}

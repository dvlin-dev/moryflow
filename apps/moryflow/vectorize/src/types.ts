/**
 * [DEFINES]: Env + API 请求/响应类型
 * [USED_BY]: src/index.ts, src/routes/*
 * [POS]: Vectorize Worker 类型定义
 *
 * [PROTOCOL]: 本文件变更时，需同步更新对应 route 的输入校验与文档。
 */

export interface Env {
  AI: Ai;
  VECTOR_INDEX: VectorizeIndex;
  AUTH_BASE_URL: string;
  EMBEDDING_MODEL: string;
  VECTOR_DIMENSIONS: string;
}

export interface EmbedRequest {
  texts: string[];
  type?: 'query' | 'document';
}

export interface EmbedResponse {
  success: true;
  data: number[][];
  shape: number[];
}

export type VectorMetadata = Record<string, string | number | boolean>;

export interface UpsertVectorInput {
  id: string;
  text: string;
  metadata?: VectorMetadata;
  namespace?: string;
}

export interface UpsertRequest {
  vectors: UpsertVectorInput[];
}

export interface UpsertResponse {
  success: true;
  mutationId: string;
  count: number;
}

export interface QueryRequest {
  text: string;
  topK?: number;
  namespace?: string;
  filter?: VectorizeVectorMetadataFilter;
}

export interface QueryMatch {
  id: string;
  score: number;
  metadata?: VectorMetadata;
}

export interface QueryResponse {
  success: true;
  matches: QueryMatch[];
  count: number;
}

export interface DeleteRequest {
  ids: string[];
}

export interface DeleteResponse {
  success: true;
  mutationId: string;
  count: number;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

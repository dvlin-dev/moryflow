/**
 * [DEFINES]: Retrieval 统一检索领域类型
 * [USED_BY]: retrieval services/controllers/repository
 * [POS]: Memox Retrieval 领域共享类型
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { JsonValue } from '../common/utils/json.zod';
import type { GraphContext } from '../graph';

export interface RetrievalScopeFilters {
  userId?: string | null;
  agentId?: string | null;
  appId?: string | null;
  runId?: string | null;
  orgId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown> | null;
  sourceTypes?: string[];
  categories?: string[];
  filters?: unknown;
}

export interface SourceChunkSearchRow {
  chunkId: string;
  sourceId: string;
  revisionId: string;
  chunkIndex: number;
  chunkCount: number;
  content: string;
  sourceType: string;
  externalId: string | null;
  projectId: string | null;
  displayPath: string | null;
  title: string;
  sourceMetadata: Record<string, JsonValue> | null;
  score: number;
}

export interface SourceChunkWindowCandidate {
  revisionId: string;
  centerChunkIndex: number;
}

export interface SourceChunkWindowRow extends SourceChunkWindowCandidate {
  chunkIndex: number;
  content: string;
}

export interface MatchedChunkReference {
  chunk_id: string;
  chunk_index: number;
}

export interface SourceSearchResult {
  result_kind: 'source';
  id: string;
  score: number;
  rank: number;
  source_id: string;
  source_type: string;
  project_id: string | null;
  external_id: string | null;
  display_path: string | null;
  title: string;
  snippet: string;
  matched_chunks: MatchedChunkReference[];
  metadata: Record<string, JsonValue> | null;
  graph_context?: GraphContext;
}

export interface MemoryFactSearchResult {
  result_kind: 'memory_fact';
  id: string;
  score: number;
  rank: number;
  memory_fact_id: string;
  content: string;
  metadata: Record<string, JsonValue> | null;
  graph_context?: GraphContext;
}

export type RetrievalResult = SourceSearchResult | MemoryFactSearchResult;

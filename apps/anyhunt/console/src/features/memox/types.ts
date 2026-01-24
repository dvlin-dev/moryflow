/**
 * Memox 模块类型定义（Mem0 对齐）
 */

// ========== Memory Types ==========

export type MemoryMessage = Record<string, string | null>;

export interface MemoryEntity {
  id?: string;
  name?: string;
  type?: string;
}

export interface MemoryRelation {
  source?: string;
  target?: string;
  relation?: string;
}

export interface Memory {
  id: string;
  memory: string;
  input?: MemoryMessage[];
  user_id?: string | null;
  agent_id?: string | null;
  app_id?: string | null;
  run_id?: string | null;
  org_id?: string | null;
  project_id?: string | null;
  metadata?: Record<string, unknown> | null;
  categories?: string[];
  keywords?: string[];
  hash?: string | null;
  immutable?: boolean;
  expiration_date?: string | null;
  timestamp?: number | null;
  entities?: MemoryEntity[] | null;
  relations?: MemoryRelation[] | null;
  created_at: string;
  updated_at: string;
}

export interface MemoriesQueryParams {
  user_id?: string;
  agent_id?: string;
  app_id?: string;
  run_id?: string;
  org_id?: string;
  project_id?: string;
  categories?: string[];
  keywords?: string;
  filters?: string;
  page?: number;
  page_size?: number;
}

// ========== Entity Types ==========

export interface Entity {
  id: string;
  name: string;
  type: 'user' | 'agent' | 'app' | 'run';
  created_at: string;
  updated_at: string;
  total_memories: number;
  owner: string;
  organization: string | null;
  metadata: Record<string, unknown> | null;
}

export interface EntityType {
  type: 'user' | 'agent' | 'app' | 'run';
  count: number;
}

export interface EntitiesQueryParams {
  org_id?: string;
  project_id?: string;
}

// ========== Graph Types ==========

export interface GraphNode {
  id: string;
  type?: string;
  name?: string;
}

export interface GraphEdge {
  id: string;
  type?: string;
  sourceId: string;
  targetId: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphQueryParams {
  user_id?: string;
  agent_id?: string;
  app_id?: string;
  run_id?: string;
  limit?: number;
}

// ========== Memory API Types ==========

export interface CreateMemoryRequest {
  messages: MemoryMessage[];
  user_id?: string;
  agent_id?: string;
  app_id?: string;
  run_id?: string;
  metadata?: Record<string, unknown>;
  includes?: string;
  excludes?: string;
  infer?: boolean;
  output_format?: 'v1.0' | 'v1.1';
  custom_categories?: Record<string, unknown>;
  custom_instructions?: string;
  immutable?: boolean;
  async_mode?: boolean;
  timestamp?: number;
  expiration_date?: string;
  org_id?: string;
  project_id?: string;
  enable_graph?: boolean;
}

export interface SearchMemoryRequest {
  query: string;
  user_id?: string;
  agent_id?: string;
  app_id?: string;
  run_id?: string;
  metadata?: Record<string, unknown>;
  filters?: unknown;
  top_k?: number;
  threshold?: number;
  fields?: string[];
  rerank?: boolean;
  keyword_search?: boolean;
  output_format?: 'v1.0' | 'v1.1';
  org_id?: string;
  project_id?: string;
  filter_memories?: boolean;
  categories?: string[];
  only_metadata_based_search?: boolean;
}

export type MemorySearchResult = Memory;

export interface CreateMemoryResponse {
  results?: {
    id: string;
    data: { memory: string };
    event: 'ADD' | 'UPDATE' | 'DELETE';
  }[];
}

/**
 * Memox 模块类型定义
 */

// ========== Memory Types ==========

export interface Memory {
  id: string;
  apiKeyId: string;
  userId: string;
  agentId: string | null;
  sessionId: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  source: string | null;
  importance: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoriesResponse {
  items: Memory[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface MemoriesQueryParams {
  apiKeyId?: string;
  limit?: number;
  offset?: number;
}

// ========== Entity Types ==========

export interface Entity {
  id: string;
  apiKeyId: string;
  userId: string;
  type: string;
  name: string;
  properties: Record<string, unknown> | null;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EntitiesResponse {
  items: Entity[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface EntitiesQueryParams {
  type?: string;
  apiKeyId?: string;
  limit?: number;
  offset?: number;
}

export interface EntityType {
  type: string;
  count: number;
}

// ========== Graph Types ==========

export interface GraphNode {
  id: string;
  type: string;
  name: string;
  properties?: Record<string, unknown> | null;
}

export interface GraphEdge {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties?: Record<string, unknown> | null;
  confidence?: number | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphQueryParams {
  userId: string;
  limit?: number;
}

// ========== Memory API Types ==========

export interface CreateMemoryRequest {
  userId: string;
  content: string;
  agentId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  source?: string;
  importance?: number;
  tags?: string[];
}

export interface SearchMemoryRequest {
  userId: string;
  query: string;
  limit?: number;
  threshold?: number;
  agentId?: string;
  sessionId?: string;
}

export interface MemorySearchResult extends Memory {
  similarity: number;
}

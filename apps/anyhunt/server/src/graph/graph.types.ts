/**
 * [DEFINES]: Graph projection/context shared types
 * [USED_BY]: graph services + retrieval schemas
 * [POS]: Memox Graph 领域类型
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { JsonValue } from '../common/utils/json.zod';

export interface GraphEntityContext {
  id: string;
  entity_type: string;
  canonical_name: string;
  aliases: string[];
}

export interface GraphRelationContext {
  id: string;
  relation_type: string;
  confidence: number;
  from: GraphEntityContext;
  to: GraphEntityContext;
}

export interface GraphContext {
  entities: GraphEntityContext[];
  relations: GraphRelationContext[];
}

export interface RawGraphEntity {
  id?: string;
  name?: string;
  type?: string;
  confidence?: number;
  [key: string]: JsonValue | undefined;
}

export interface RawGraphRelation {
  source?: string;
  target?: string;
  relation?: string;
  confidence?: number;
  [key: string]: JsonValue | undefined;
}

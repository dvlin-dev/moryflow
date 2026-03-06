/**
 * [PROVIDES]: Graph canonicalization helpers
 * [DEPENDS]: graph raw types
 * [POS]: Graph 规范化工具
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { RawGraphEntity, RawGraphRelation } from './graph.types';

export const MIN_CANONICAL_GRAPH_CONFIDENCE = 0.5;

export function normalizeCanonicalName(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ');
}

export function normalizeEntityType(value?: string): string {
  if (!value?.trim()) {
    return 'concept';
  }

  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_');
}

export function normalizeRelationType(value?: string): string {
  if (!value?.trim()) {
    return 'related_to';
  }

  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_');
}

export function normalizeGraphEntities(
  entities: RawGraphEntity[],
): RawGraphEntity[] {
  return entities.filter(
    (entity) =>
      typeof entity.name === 'string' && entity.name.trim().length > 0,
  );
}

export function normalizeGraphRelations(
  relations: RawGraphRelation[],
): RawGraphRelation[] {
  return relations.filter(
    (relation) =>
      typeof relation.source === 'string' &&
      relation.source.trim().length > 0 &&
      typeof relation.target === 'string' &&
      relation.target.trim().length > 0,
  );
}

export function shouldPromoteObservation(confidence?: number): boolean {
  return (confidence ?? 0.6) >= MIN_CANONICAL_GRAPH_CONFIDENCE;
}

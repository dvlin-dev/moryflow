/**
 * [PROVIDES]: Memory API 响应映射
 * [DEPENDS]: Prisma history types, Memory types
 * [POS]: Memory Service 的响应输出格式化
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { MemoryHistory as PrismaMemoryHistory } from '../../../generated/prisma-vector/client';
import type { Memory } from '../memory.repository';

export function toMemoryResponse(memory: Memory): Record<string, unknown> {
  return {
    id: memory.id,
    memory: memory.memory,
    input: memory.input ?? undefined,
    owner:
      memory.userId ??
      memory.agentId ??
      memory.appId ??
      memory.runId ??
      memory.apiKeyId,
    organization: memory.orgId ?? null,
    user_id: memory.userId ?? null,
    agent_id: memory.agentId ?? null,
    app_id: memory.appId ?? null,
    run_id: memory.runId ?? null,
    org_id: memory.orgId ?? null,
    project_id: memory.projectId ?? null,
    metadata: memory.metadata ?? null,
    categories: memory.categories ?? [],
    keywords: memory.keywords ?? [],
    hash: memory.hash ?? null,
    immutable: memory.immutable ?? false,
    expiration_date: memory.expirationDate
      ? memory.expirationDate.toISOString()
      : null,
    timestamp: memory.timestamp
      ? Math.floor(memory.timestamp.getTime() / 1000)
      : null,
    entities: memory.entities ?? null,
    relations: memory.relations ?? null,
    created_at: memory.createdAt.toISOString(),
    updated_at: memory.updatedAt.toISOString(),
  };
}

export function toUpdateResponse(memory: Memory): Record<string, unknown> {
  return {
    id: memory.id,
    text: memory.memory,
    user_id: memory.userId ?? null,
    agent_id: memory.agentId ?? null,
    app_id: memory.appId ?? null,
    run_id: memory.runId ?? null,
    hash: memory.hash ?? null,
    metadata: memory.metadata ?? null,
    created_at: memory.createdAt.toISOString(),
    updated_at: memory.updatedAt.toISOString(),
  };
}

export function toHistoryResponse(
  history: PrismaMemoryHistory,
): Record<string, unknown> {
  return {
    id: history.id,
    memory_id: history.memoryId,
    input: history.input ?? null,
    old_memory: history.oldMemory ?? null,
    new_memory: history.newMemory,
    user_id: history.userId,
    event: history.event,
    metadata: history.metadata ?? null,
    created_at: history.createdAt.toISOString(),
    updated_at: history.updatedAt.toISOString(),
  };
}

export function wrapOutputFormat(
  results: Record<string, unknown>[],
  outputFormat?: string,
) {
  if (outputFormat === 'v1.0') {
    return results;
  }

  return { results };
}

export function applyFieldsFilter(
  item: Record<string, unknown>,
  fields?: string[],
): Record<string, unknown> {
  if (!fields || fields.length === 0) {
    return item;
  }

  const allowed = new Set(fields);
  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(item)) {
    if (key === 'id' || allowed.has(key)) {
      filtered[key] = value;
    }
  }

  return filtered;
}

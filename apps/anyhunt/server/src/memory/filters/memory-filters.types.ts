/**
 * [DEFINES]: MemorySearchFilters - Memory 查询过滤结构
 * [USED_BY]: memory.service.ts, memory.repository.ts, memory-filter.builder.ts
 * [POS]: Memory 模块的共享过滤类型
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export interface MemorySearchFilters {
  userId?: string | null;
  agentId?: string | null;
  appId?: string | null;
  runId?: string | null;
  orgId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown> | null;
  categories?: string[];
  keywords?: string[];
  createdAt?: { gte?: Date | null; lte?: Date | null };
  updatedAt?: { gte?: Date | null; lte?: Date | null };
  filters?: unknown;
}

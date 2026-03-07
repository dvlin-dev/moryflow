/**
 * [DEFINES]: MemorySearchFilters - Memory 查询过滤结构
 * [USED_BY]: memory.service.ts, memory.repository.ts, memory-filter.builder.ts
 * [POS]: Memory 模块的共享过滤类型
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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

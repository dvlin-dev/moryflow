/**
 * [PROVIDES]: Memory 查询参数解析与过滤构建
 * [DEPENDS]: NestJS exceptions, MemorySearchFilters
 * [POS]: 将 DTO/query 转换为 repository filters
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { BadRequestException } from '@nestjs/common';
import type { MemorySearchFilters } from './memory-filters.types';

export function parseDate(
  value: string | undefined,
  field: string,
): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${field} is invalid`);
  }
  return parsed;
}

export function parseKeywordList(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

export function buildDateRange(
  start?: string,
  end?: string,
): MemorySearchFilters['createdAt'] {
  const startDate = parseDate(start, 'start_date');
  const endDate = parseDate(end, 'end_date');

  if (!startDate && !endDate) {
    return undefined;
  }

  return {
    ...(startDate ? { gte: startDate } : {}),
    ...(endDate ? { lte: endDate } : {}),
  };
}

export function buildFilters(params: {
  user_id?: string;
  agent_id?: string;
  app_id?: string;
  run_id?: string;
  org_id?: string;
  project_id?: string;
  metadata?: Record<string, unknown> | null;
  categories?: string[];
  keywords?: string[];
  start_date?: string;
  end_date?: string;
  filters?: unknown;
}): MemorySearchFilters {
  return {
    userId: params.user_id ?? null,
    agentId: params.agent_id ?? null,
    appId: params.app_id ?? null,
    runId: params.run_id ?? null,
    orgId: params.org_id ?? null,
    projectId: params.project_id ?? null,
    metadata: params.metadata ?? null,
    categories: params.categories ?? [],
    keywords: params.keywords ?? [],
    createdAt: buildDateRange(params.start_date, params.end_date),
    filters: params.filters,
  };
}

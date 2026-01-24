/**
 * [PROVIDES]: Memory filters DSL 解析与 SQL 构建
 * [DEPENDS]: Prisma SQL, MemorySearchFilters
 * [POS]: MemoryRepository 的过滤器解析与 WHERE 子句生成
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma-vector/client';
import type { MemorySearchFilters } from './memory-filters.types';

type FilterOperator =
  | 'eq'
  | 'ne'
  | 'in'
  | 'gte'
  | 'lte'
  | 'gt'
  | 'lt'
  | 'contains'
  | 'icontains'
  | 'exists';

type FilterNode =
  | { type: 'and' | 'or'; children: FilterNode[] }
  | { type: 'not'; child: FilterNode }
  | {
      type: 'condition';
      field: string;
      operator: FilterOperator;
      value: unknown;
    };

const FILTER_FIELD_MAP: Record<
  string,
  { column: string; type: 'string' | 'date' | 'array' }
> = {
  user_id: { column: 'userId', type: 'string' },
  agent_id: { column: 'agentId', type: 'string' },
  app_id: { column: 'appId', type: 'string' },
  run_id: { column: 'runId', type: 'string' },
  org_id: { column: 'orgId', type: 'string' },
  project_id: { column: 'projectId', type: 'string' },
  created_at: { column: 'createdAt', type: 'date' },
  updated_at: { column: 'updatedAt', type: 'date' },
  categories: { column: 'categories', type: 'array' },
  keywords: { column: 'keywords', type: 'array' },
};

const FILTER_OPERATORS = new Set([
  'in',
  'gte',
  'lte',
  'gt',
  'lt',
  'ne',
  'contains',
  'icontains',
  '*',
]);

export class MemoryFilterBuilder {
  buildWhereSql(apiKeyId: string, filters: MemorySearchFilters): Prisma.Sql {
    const conditions: Prisma.Sql[] = [Prisma.sql`"apiKeyId" = ${apiKeyId}`];

    if (filters.userId) {
      conditions.push(Prisma.sql`"userId" = ${filters.userId}`);
    }
    if (filters.agentId) {
      conditions.push(Prisma.sql`"agentId" = ${filters.agentId}`);
    }
    if (filters.appId) {
      conditions.push(Prisma.sql`"appId" = ${filters.appId}`);
    }
    if (filters.runId) {
      conditions.push(Prisma.sql`"runId" = ${filters.runId}`);
    }
    if (filters.orgId) {
      conditions.push(Prisma.sql`"orgId" = ${filters.orgId}`);
    }
    if (filters.projectId) {
      conditions.push(Prisma.sql`"projectId" = ${filters.projectId}`);
    }
    if (filters.metadata && Object.keys(filters.metadata).length > 0) {
      const metadataJson = JSON.stringify(filters.metadata);
      conditions.push(Prisma.sql`"metadata" @> ${metadataJson}::jsonb`);
    }
    if (filters.categories && filters.categories.length > 0) {
      const categoriesArray = this.buildTextArray(filters.categories);
      conditions.push(Prisma.sql`"categories" && ${categoriesArray}`);
    }
    if (filters.keywords && filters.keywords.length > 0) {
      const keywordsArray = this.buildTextArray(filters.keywords);
      conditions.push(Prisma.sql`"keywords" && ${keywordsArray}`);
    }
    if (filters.createdAt?.gte) {
      conditions.push(Prisma.sql`"createdAt" >= ${filters.createdAt.gte}`);
    }
    if (filters.createdAt?.lte) {
      conditions.push(Prisma.sql`"createdAt" <= ${filters.createdAt.lte}`);
    }
    if (filters.updatedAt?.gte) {
      conditions.push(Prisma.sql`"updatedAt" >= ${filters.updatedAt.gte}`);
    }
    if (filters.updatedAt?.lte) {
      conditions.push(Prisma.sql`"updatedAt" <= ${filters.updatedAt.lte}`);
    }

    const filterNode = this.parseFilters(filters.filters);
    if (filterNode) {
      conditions.push(this.buildFilterSql(filterNode));
    }

    return Prisma.sql`${this.joinSql(conditions, ' AND ')}`;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private parseFilters(input: unknown): FilterNode | null {
    if (input === null || input === undefined) {
      return null;
    }

    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) {
        return null;
      }
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return this.parseFilters(parsed);
      } catch {
        throw new BadRequestException('Invalid filters JSON');
      }
    }

    if (Array.isArray(input)) {
      const children = input
        .map((item) => this.parseFilters(item))
        .filter((node): node is FilterNode => Boolean(node));
      if (!children.length) {
        return null;
      }
      return { type: 'and', children };
    }

    if (!this.isPlainObject(input)) {
      throw new BadRequestException('Filters must be an object');
    }

    const record = input;
    const nodes: FilterNode[] = [];

    for (const [rawKey, value] of Object.entries(record)) {
      const key = rawKey.toUpperCase();
      if (key === 'AND' || key === 'OR') {
        if (!Array.isArray(value)) {
          throw new BadRequestException(`${rawKey} must be an array`);
        }
        const children = value
          .map((item) => this.parseFilters(item))
          .filter((node): node is FilterNode => Boolean(node));
        if (children.length) {
          nodes.push({ type: key === 'AND' ? 'and' : 'or', children });
        }
        continue;
      }
      if (key === 'NOT') {
        const child = this.parseFilters(value);
        if (child) {
          nodes.push({ type: 'not', child });
        }
        continue;
      }

      const node = this.parseFieldCondition(rawKey, value);
      if (node) {
        nodes.push(node);
      }
    }

    if (!nodes.length) {
      return null;
    }

    if (nodes.length === 1) {
      return nodes[0];
    }

    return { type: 'and', children: nodes };
  }

  private parseFieldCondition(
    field: string,
    value: unknown,
  ): FilterNode | null {
    if (!FILTER_FIELD_MAP[field]) {
      throw new BadRequestException(`Unsupported filter field: ${field}`);
    }

    if (value === '*') {
      return { type: 'condition', field, operator: 'exists', value: true };
    }

    if (value === undefined) {
      return null;
    }

    if (Array.isArray(value)) {
      if (!value.length) {
        return null;
      }
      return { type: 'condition', field, operator: 'in', value };
    }

    if (this.isPlainObject(value)) {
      const operatorKeys = Object.keys(value).filter((key) =>
        FILTER_OPERATORS.has(key),
      );

      if (!operatorKeys.length) {
        return { type: 'condition', field, operator: 'eq', value };
      }

      const nodes: FilterNode[] = [];
      for (const operator of operatorKeys) {
        if (operator === '*') {
          nodes.push({
            type: 'condition',
            field,
            operator: 'exists',
            value: true,
          });
          continue;
        }
        nodes.push({
          type: 'condition',
          field,
          operator: operator as FilterOperator,
          value: value[operator],
        });
      }

      if (!nodes.length) {
        return null;
      }

      return nodes.length === 1 ? nodes[0] : { type: 'and', children: nodes };
    }

    return { type: 'condition', field, operator: 'eq', value };
  }

  private buildTextArray(values: string[]): Prisma.Sql {
    if (!values.length) {
      return Prisma.sql`ARRAY[]::text[]`;
    }
    const items = values.map((value) => Prisma.sql`${value}`);
    return Prisma.sql`ARRAY[${this.joinSql(items, ', ')}]::text[]`;
  }

  private joinSql(parts: Prisma.Sql[], separator: string): Prisma.Sql {
    if (!parts.length) {
      return Prisma.sql``;
    }

    return parts
      .slice(1)
      .reduce(
        (acc, part) => Prisma.sql`${acc}${Prisma.raw(separator)}${part}`,
        parts[0],
      );
  }

  private coerceStringArray(value: unknown, operator: string): string[] {
    if (!Array.isArray(value)) {
      throw new BadRequestException(
        `Filter operator "${operator}" requires an array value`,
      );
    }

    return value.map((item) => String(item));
  }

  private coerceScalar(value: unknown, field: string): string {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }

    throw new BadRequestException(`Invalid scalar filter for ${field}`);
  }

  private coerceDate(value: unknown, field: string): Date {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    throw new BadRequestException(`Invalid date filter for ${field}`);
  }

  private buildConditionSql(node: FilterNode): Prisma.Sql {
    if (node.type !== 'condition') {
      return Prisma.sql``;
    }

    const config = FILTER_FIELD_MAP[node.field];
    const column = Prisma.raw(`"${config.column}"`);

    if (node.operator === 'exists') {
      if (config.type === 'array') {
        return Prisma.sql`COALESCE(array_length(${column}, 1), 0) > 0`;
      }
      return Prisma.sql`${column} IS NOT NULL`;
    }

    if (node.operator === 'in') {
      const values = this.coerceStringArray(node.value, node.operator);
      const arraySql = this.buildTextArray(values);
      if (config.type === 'array') {
        return Prisma.sql`${column} && ${arraySql}`;
      }
      return Prisma.sql`${column} = ANY(${arraySql})`;
    }

    if (node.operator === 'contains' || node.operator === 'icontains') {
      if (typeof node.value !== 'string') {
        throw new BadRequestException(
          `Filter operator "${node.operator}" requires a string value`,
        );
      }
      const pattern = `%${node.value}%`;
      if (config.type === 'array') {
        return Prisma.sql`EXISTS (SELECT 1 FROM unnest(${column}) AS value WHERE value ${
          node.operator === 'icontains'
            ? Prisma.raw('ILIKE')
            : Prisma.raw('LIKE')
        } ${pattern})`;
      }
      return Prisma.sql`${column} ${
        node.operator === 'icontains' ? Prisma.raw('ILIKE') : Prisma.raw('LIKE')
      } ${pattern}`;
    }

    if (
      node.operator === 'gte' ||
      node.operator === 'lte' ||
      node.operator === 'gt' ||
      node.operator === 'lt'
    ) {
      const value =
        config.type === 'date'
          ? this.coerceDate(node.value, node.field)
          : node.value;
      const comparator =
        node.operator === 'gte'
          ? '>='
          : node.operator === 'lte'
            ? '<='
            : node.operator === 'gt'
              ? '>'
              : '<';
      return Prisma.sql`${column} ${Prisma.raw(comparator)} ${value}`;
    }

    if (node.operator === 'ne') {
      if (node.value === null) {
        return Prisma.sql`${column} IS NOT NULL`;
      }

      if (config.type === 'array') {
        const arraySql = this.buildTextArray([
          this.coerceScalar(node.value, node.field),
        ]);
        return Prisma.sql`NOT (${column} @> ${arraySql})`;
      }

      return Prisma.sql`${column} <> ${node.value}`;
    }

    if (node.operator === 'eq') {
      if (node.value === null) {
        return Prisma.sql`${column} IS NULL`;
      }

      if (config.type === 'array') {
        const arraySql = this.buildTextArray([
          this.coerceScalar(node.value, node.field),
        ]);
        return Prisma.sql`${column} @> ${arraySql}`;
      }

      return Prisma.sql`${column} = ${node.value}`;
    }

    return Prisma.sql`TRUE`;
  }

  private buildFilterSql(node: FilterNode): Prisma.Sql {
    if (node.type === 'condition') {
      return this.buildConditionSql(node);
    }

    if (node.type === 'not') {
      const child = this.buildFilterSql(node.child);
      return Prisma.sql`NOT (${child})`;
    }

    const children = node.children.map((child) => this.buildFilterSql(child));
    if (!children.length) {
      return Prisma.sql`TRUE`;
    }

    const separator = node.type === 'and' ? ' AND ' : ' OR ';
    return Prisma.sql`(${this.joinSql(children, separator)})`;
  }
}

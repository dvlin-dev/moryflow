/**
 * [INPUT]: apiKeyId, ScopeRegistry DTO-like payloads
 * [OUTPUT]: 作用域实体 list / created entity
 * [POS]: ScopeRegistry 业务逻辑层（user/agent/app/run 作用域投影）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-vector/client';
import {
  ScopeRegistryRepository,
  type ScopeRegistryRecord,
} from './scope-registry.repository';
import { VectorPrismaService } from '../vector-prisma/vector-prisma.service';
import type {
  CreateUserInput,
  CreateAgentInput,
  CreateAppInput,
  CreateRunInput,
  ListEntitiesQuery,
} from './scope-registry.types';

const SCOPE_TYPES = ['user', 'agent', 'app', 'run'] as const;

@Injectable()
export class ScopeRegistryService {
  constructor(
    private readonly repository: ScopeRegistryRepository,
    private readonly vectorPrisma: VectorPrismaService,
  ) {}

  private toEntityResponse(
    entity: ScopeRegistryRecord,
    totalMemories: number,
  ): Record<string, unknown> {
    return {
      id: entity.entityId,
      name: entity.name ?? entity.entityId,
      type: entity.type,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
      total_memories: totalMemories,
      owner: entity.apiKeyId,
      organization: entity.orgId ?? null,
      metadata: entity.metadata ?? null,
    };
  }

  private async countMemoriesByType(params: {
    apiKeyId: string;
    type: (typeof SCOPE_TYPES)[number];
    entityIds: string[];
    orgId?: string;
    projectId?: string;
  }): Promise<Map<string, number>> {
    const { apiKeyId, type, entityIds, orgId, projectId } = params;
    if (!entityIds.length) {
      return new Map();
    }

    const column =
      type === 'user'
        ? 'userId'
        : type === 'agent'
          ? 'agentId'
          : type === 'app'
            ? 'appId'
            : 'runId';
    const columnSql = Prisma.raw(`"${column}"`);

    const rows = await this.vectorPrisma.$queryRaw<
      Array<{ entityId: string; total: number }>
    >(Prisma.sql`
      SELECT
        ${columnSql}::text AS "entityId",
        COUNT(*)::int AS "total"
      FROM "MemoryFact"
      WHERE "apiKeyId" = ${apiKeyId}
        AND ("expirationDate" IS NULL OR "expirationDate" > NOW())
        AND ${columnSql} IS NOT NULL
        AND ${columnSql} IN (${Prisma.join(entityIds)})
        ${orgId ? Prisma.sql`AND "orgId" = ${orgId}` : Prisma.sql``}
        ${projectId ? Prisma.sql`AND "projectId" = ${projectId}` : Prisma.sql``}
      GROUP BY ${columnSql}
    `);

    return new Map(rows.map((row) => [row.entityId, Number(row.total)]));
  }

  async createUser(apiKeyId: string, dto: CreateUserInput) {
    const entity = await this.repository.upsert(apiKeyId, {
      type: 'user',
      entityId: dto.user_id,
      metadata: dto.metadata ?? null,
      orgId: dto.org_id ?? null,
      projectId: dto.project_id ?? null,
    });

    return {
      user_id: entity.entityId,
      metadata: entity.metadata ?? null,
    };
  }

  async createAgent(apiKeyId: string, dto: CreateAgentInput) {
    const entity = await this.repository.upsert(apiKeyId, {
      type: 'agent',
      entityId: dto.agent_id,
      name: dto.name ?? null,
      metadata: dto.metadata ?? null,
      orgId: dto.org_id ?? null,
      projectId: dto.project_id ?? null,
    });

    return {
      agent_id: entity.entityId,
      name: entity.name ?? null,
      metadata: entity.metadata ?? null,
    };
  }

  async createApp(apiKeyId: string, dto: CreateAppInput) {
    const entity = await this.repository.upsert(apiKeyId, {
      type: 'app',
      entityId: dto.app_id,
      name: dto.name ?? null,
      metadata: dto.metadata ?? null,
      orgId: dto.org_id ?? null,
      projectId: dto.project_id ?? null,
    });

    return {
      app_id: entity.entityId,
      name: entity.name ?? null,
      metadata: entity.metadata ?? null,
    };
  }

  async createRun(apiKeyId: string, dto: CreateRunInput) {
    const entity = await this.repository.upsert(apiKeyId, {
      type: 'run',
      entityId: dto.run_id,
      name: dto.name ?? null,
      metadata: dto.metadata ?? null,
      orgId: dto.org_id ?? null,
      projectId: dto.project_id ?? null,
    });

    return {
      run_id: entity.entityId,
      name: entity.name ?? null,
      metadata: entity.metadata ?? null,
    };
  }

  async listEntities(apiKeyId: string, query: ListEntitiesQuery) {
    const entities = await this.vectorPrisma.scopeRegistry.findMany({
      where: {
        apiKeyId,
        ...(query.org_id ? { orgId: query.org_id } : {}),
        ...(query.project_id ? { projectId: query.project_id } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const idsByType: Record<(typeof SCOPE_TYPES)[number], string[]> = {
      user: [],
      agent: [],
      app: [],
      run: [],
    };

    for (const entity of entities) {
      idsByType[entity.type as (typeof SCOPE_TYPES)[number]]?.push(
        entity.entityId,
      );
    }

    const countMaps = await Promise.all(
      SCOPE_TYPES.map((type) =>
        this.countMemoriesByType({
          apiKeyId,
          type,
          entityIds: idsByType[type],
          orgId: query.org_id,
          projectId: query.project_id,
        }),
      ),
    );

    const countsByType = new Map<
      (typeof SCOPE_TYPES)[number],
      Map<string, number>
    >(SCOPE_TYPES.map((type, index) => [type, countMaps[index] ?? new Map()]));

    return entities.map((entity) =>
      this.toEntityResponse(
        entity,
        countsByType
          .get(entity.type as (typeof SCOPE_TYPES)[number])
          ?.get(entity.entityId) ?? 0,
      ),
    );
  }

  async listEntityFilters(apiKeyId: string) {
    const grouped = await this.vectorPrisma.scopeRegistry.groupBy({
      by: ['type'],
      where: { apiKeyId },
      _count: { type: true },
    });

    const counts = new Map(
      grouped.map((item) => [item.type, item._count.type]),
    );

    return SCOPE_TYPES.map((type) => ({
      type,
      count: counts.get(type) ?? 0,
    }));
  }
}

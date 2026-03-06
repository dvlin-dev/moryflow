/**
 * [INPUT]: apiKeyId, Mem0 entity DTOs
 * [OUTPUT]: Mem0 entity list / created entity
 * [POS]: Entity 业务逻辑层（Mem0 entities，聚合统计 total_memories）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-vector/client';
import { EntityRepository, type MemoxEntity } from './entity.repository';
import { VectorPrismaService } from '../vector-prisma/vector-prisma.service';
import type {
  CreateUserInput,
  CreateAgentInput,
  CreateAppInput,
  CreateRunInput,
  ListEntitiesQuery,
} from './dto';

const ENTITY_TYPES = ['user', 'agent', 'app', 'run'] as const;

@Injectable()
export class EntityService {
  constructor(
    private readonly repository: EntityRepository,
    private readonly vectorPrisma: VectorPrismaService,
  ) {}

  private toEntityResponse(
    entity: MemoxEntity,
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
    type: (typeof ENTITY_TYPES)[number];
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
      FROM "Memory"
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
    const entities = await this.vectorPrisma.memoxEntity.findMany({
      where: {
        apiKeyId,
        ...(query.org_id ? { orgId: query.org_id } : {}),
        ...(query.project_id ? { projectId: query.project_id } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const idsByType: Record<(typeof ENTITY_TYPES)[number], string[]> = {
      user: [],
      agent: [],
      app: [],
      run: [],
    };
    for (const entity of entities) {
      idsByType[entity.type as (typeof ENTITY_TYPES)[number]]?.push(
        entity.entityId,
      );
    }

    const countMaps = await Promise.all(
      ENTITY_TYPES.map((type) =>
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
      (typeof ENTITY_TYPES)[number],
      Map<string, number>
    >(ENTITY_TYPES.map((type, index) => [type, countMaps[index] ?? new Map()]));

    return entities.map((entity) =>
      this.toEntityResponse(
        entity,
        countsByType
          .get(entity.type as (typeof ENTITY_TYPES)[number])
          ?.get(entity.entityId) ?? 0,
      ),
    );
  }

  async listEntityFilters(apiKeyId: string) {
    const grouped = await this.vectorPrisma.memoxEntity.groupBy({
      by: ['type'],
      where: { apiKeyId },
      _count: { type: true },
    });

    const counts = new Map(
      grouped.map((item) => [item.type, item._count.type]),
    );

    return ENTITY_TYPES.map((type) => ({
      type,
      count: counts.get(type) ?? 0,
    }));
  }
}

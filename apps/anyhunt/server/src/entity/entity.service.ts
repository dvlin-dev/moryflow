/**
 * [INPUT]: apiKeyId, Mem0 entity DTOs
 * [OUTPUT]: Mem0 entity list / created entity
 * [POS]: Entity 业务逻辑层（Mem0 entities）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
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

  private async countMemoriesByEntity(
    apiKeyId: string,
    entity: MemoxEntity,
  ): Promise<number> {
    const where: Record<string, unknown> = { apiKeyId };

    if (entity.type === 'user') {
      where.userId = entity.entityId;
    } else if (entity.type === 'agent') {
      where.agentId = entity.entityId;
    } else if (entity.type === 'app') {
      where.appId = entity.entityId;
    } else if (entity.type === 'run') {
      where.runId = entity.entityId;
    }

    return this.vectorPrisma.memory.count({ where });
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

    const counts = await Promise.all(
      entities.map((entity) => this.countMemoriesByEntity(apiKeyId, entity)),
    );

    return entities.map((entity, index) =>
      this.toEntityResponse(entity, counts[index] ?? 0),
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

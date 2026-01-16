/**
 * [INPUT]: apiKeyId, CreateEntityInput, ListEntitiesByUserOptions
 * [OUTPUT]: Entity, EntityWithApiKeyName[], pagination data
 * [POS]: Entity business logic layer - CRUD operations for knowledge graph entities
 *        跨库查询：主库 ApiKey + 向量库 Entity
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and src/entity/CLAUDE.md
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma-vector/client';
import { PrismaService } from '../prisma/prisma.service';
import { VectorPrismaService } from '../vector-prisma/vector-prisma.service';
import { asRecordOrNull } from '../common/utils';
import { EntityRepository, Entity } from './entity.repository';
import type { CreateEntityInput } from './dto';

export type EntityWithApiKeyName = Omit<Entity, 'properties'> & {
  properties: Record<string, unknown> | null;
  apiKeyName: string;
};

export interface ListEntitiesByUserOptions {
  type?: string;
  apiKeyId?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class EntityService {
  private readonly logger = new Logger(EntityService.name);

  constructor(
    private readonly repository: EntityRepository,
    private readonly prisma: PrismaService,
    private readonly vectorPrisma: VectorPrismaService,
  ) {}

  /**
   * 从 Map 中获取 ApiKey 名称，找不到时记录告警
   */
  private resolveApiKeyName(
    apiKeyId: string,
    resourceId: string,
    map: Map<string, string>,
  ): string {
    const name = map.get(apiKeyId);
    if (!name) {
      this.logger.warn(
        `Entity ${resourceId} references unknown apiKeyId: ${apiKeyId}`,
      );
    }
    return name ?? 'Unknown';
  }

  /**
   * 创建实体
   */
  async create(apiKeyId: string, dto: CreateEntityInput): Promise<Entity> {
    const entity = await this.repository.create(apiKeyId, {
      userId: dto.userId,
      type: dto.type,
      name: dto.name,
      properties: dto.properties ?? null,
      confidence: dto.confidence ?? 1.0,
    });

    this.logger.log(`Created entity ${entity.id}: ${dto.type}/${dto.name}`);
    return entity;
  }

  /**
   * 创建或更新实体
   */
  async upsert(apiKeyId: string, dto: CreateEntityInput): Promise<Entity> {
    return this.repository.upsert(apiKeyId, {
      userId: dto.userId,
      type: dto.type,
      name: dto.name,
      properties: dto.properties,
      confidence: dto.confidence ?? 1.0,
    });
  }

  /**
   * 批量创建实体
   */
  async createMany(
    apiKeyId: string,
    dtos: CreateEntityInput[],
  ): Promise<Entity[]> {
    const entities: Entity[] = [];
    for (const dto of dtos) {
      const entity = await this.upsert(apiKeyId, dto);
      entities.push(entity);
    }
    return entities;
  }

  /**
   * 列出用户的实体
   */
  async list(
    apiKeyId: string,
    userId: string,
    options: { type?: string; limit?: number; offset?: number } = {},
  ): Promise<Entity[]> {
    const where: Prisma.EntityWhereInput = {
      userId,
      ...(options.type ? { type: options.type } : {}),
    };

    return this.repository.findMany(apiKeyId, {
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit ?? 100,
      skip: options.offset ?? 0,
    });
  }

  /**
   * 获取单个实体
   */
  async getById(apiKeyId: string, id: string): Promise<Entity | null> {
    return this.repository.findById(apiKeyId, id);
  }

  /**
   * 按类型查找实体
   */
  async getByType(
    apiKeyId: string,
    userId: string,
    type: string,
  ): Promise<Entity[]> {
    return this.repository.findByType(apiKeyId, userId, type);
  }

  /**
   * 删除实体
   */
  async delete(apiKeyId: string, id: string): Promise<void> {
    await this.repository.deleteById(apiKeyId, id);
    this.logger.log(`Deleted entity ${id}`);
  }

  /**
   * 获取用户所有 API Keys 下的 Entities（Console 用）
   * 跨库查询：主库查 ApiKey，向量库查 Entity
   */
  async listByUser(
    userId: string,
    options: ListEntitiesByUserOptions = {},
  ): Promise<{ entities: EntityWithApiKeyName[]; total: number }> {
    const { type, apiKeyId, limit = 20, offset = 0 } = options;

    // 1. 从主库获取用户的 ApiKey 列表
    const apiKeys = await this.prisma.apiKey.findMany({
      where: apiKeyId ? { id: apiKeyId, userId } : { userId },
      select: { id: true, name: true },
    });

    if (apiKeys.length === 0) {
      return { entities: [], total: 0 };
    }

    const apiKeyIds = apiKeys.map((k) => k.id);
    const apiKeyNameMap = new Map(apiKeys.map((k) => [k.id, k.name]));

    // 2. 从向量库查询 Entity
    const where: Prisma.EntityWhereInput = {
      apiKeyId: { in: apiKeyIds },
    };

    if (type) {
      where.type = type;
    }

    const [entities, total] = await Promise.all([
      this.vectorPrisma.entity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.vectorPrisma.entity.count({ where }),
    ]);

    // 3. 应用层组装 apiKeyName
    return {
      entities: entities.map((e) => ({
        id: e.id,
        apiKeyId: e.apiKeyId,
        userId: e.userId,
        type: e.type,
        name: e.name,
        properties: asRecordOrNull(e.properties),
        confidence: e.confidence,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        apiKeyName: this.resolveApiKeyName(e.apiKeyId, e.id, apiKeyNameMap),
      })),
      total,
    };
  }

  /**
   * 按 ID 删除实体（Console 用，验证归属）
   * 跨库查询：主库验证 ApiKey 归属，向量库删除 Entity
   */
  async deleteByUser(userId: string, entityId: string): Promise<void> {
    // 1. 从向量库查找 Entity
    const entity = await this.vectorPrisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true, apiKeyId: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    // 2. 从主库验证 ApiKey 归属（用 count 减少数据传输）
    const apiKeyBelongsToUser = await this.prisma.apiKey.count({
      where: { id: entity.apiKeyId, userId },
    });

    if (apiKeyBelongsToUser === 0) {
      throw new NotFoundException('Entity not found');
    }

    // 3. 从向量库删除 Entity
    await this.vectorPrisma.entity.delete({
      where: { id: entityId },
    });

    this.logger.log(`Deleted entity ${entityId} by user ${userId}`);
  }

  /**
   * 获取用户的所有 Entity 类型（Console 用）
   * 跨库查询：主库查 ApiKey，向量库查 Entity
   */
  async getTypesByUser(userId: string): Promise<string[]> {
    // 1. 从主库获取用户的 ApiKey 列表
    const apiKeys = await this.prisma.apiKey.findMany({
      where: { userId },
      select: { id: true },
    });

    if (apiKeys.length === 0) {
      return [];
    }

    const apiKeyIds = apiKeys.map((k) => k.id);

    // 2. 从向量库查询 Entity 类型
    const types = await this.vectorPrisma.entity.findMany({
      where: { apiKeyId: { in: apiKeyIds } },
      select: { type: true },
      distinct: ['type'],
      orderBy: { type: 'asc' },
    });

    return types.map((t) => t.type);
  }
}

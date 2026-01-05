/**
 * [INPUT]: apiKeyId, CreateEntityDto, ListEntitiesByUserOptions
 * [OUTPUT]: Entity, EntityWithApiKeyName[], pagination data
 * [POS]: Entity business logic layer - CRUD operations for knowledge graph entities
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and apps/server/src/entity/CLAUDE.md
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntityRepository, Entity } from './entity.repository';
import { CreateEntityDto } from './dto';

export interface EntityWithApiKeyName extends Entity {
  apiKeyName: string;
}

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
  ) {}

  /**
   * 创建实体
   */
  async create(apiKeyId: string, dto: CreateEntityDto): Promise<Entity> {
    const entity = await this.repository.create(apiKeyId, {
      userId: dto.userId,
      type: dto.type,
      name: dto.name,
      properties: dto.properties,
      confidence: dto.confidence ?? 1.0,
    });

    this.logger.log(`Created entity ${entity.id}: ${dto.type}/${dto.name}`);
    return entity;
  }

  /**
   * 创建或更新实体
   */
  async upsert(apiKeyId: string, dto: CreateEntityDto): Promise<Entity> {
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
  async createMany(apiKeyId: string, dtos: CreateEntityDto[]): Promise<Entity[]> {
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
    const where: Record<string, any> = { userId };
    if (options.type) {
      where.type = options.type;
    }

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
  async getByType(apiKeyId: string, userId: string, type: string): Promise<Entity[]> {
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
   */
  async listByUser(
    userId: string,
    options: ListEntitiesByUserOptions = {},
  ): Promise<{ entities: EntityWithApiKeyName[]; total: number }> {
    const { type, apiKeyId, limit = 20, offset = 0 } = options;

    const where: Record<string, unknown> = {
      apiKey: { userId },
    };

    if (type) {
      where.type = type;
    }

    if (apiKeyId) {
      where.apiKeyId = apiKeyId;
    }

    const [entities, total] = await Promise.all([
      this.prisma.entity.findMany({
        where,
        include: {
          apiKey: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.entity.count({ where }),
    ]);

    return {
      entities: entities.map((e) => ({
        id: e.id,
        apiKeyId: e.apiKeyId,
        userId: e.userId,
        type: e.type,
        name: e.name,
        properties: e.properties as Record<string, unknown> | null,
        confidence: e.confidence,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        apiKeyName: e.apiKey.name,
      })),
      total,
    };
  }

  /**
   * 按 ID 删除实体（Console 用，验证归属）
   */
  async deleteByUser(userId: string, entityId: string): Promise<void> {
    const entity = await this.prisma.entity.findFirst({
      where: {
        id: entityId,
        apiKey: { userId },
      },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    await this.prisma.entity.delete({
      where: { id: entityId },
    });

    this.logger.log(`Deleted entity ${entityId} by user ${userId}`);
  }

  /**
   * 获取用户的所有 Entity 类型（Console 用）
   */
  async getTypesByUser(userId: string): Promise<string[]> {
    const types = await this.prisma.entity.findMany({
      where: {
        apiKey: { userId },
      },
      select: { type: true },
      distinct: ['type'],
      orderBy: { type: 'asc' },
    });

    return types.map((t) => t.type);
  }
}

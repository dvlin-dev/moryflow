/**
 * [POS]: Entity Repository
 */

import { Injectable } from '@nestjs/common';
import type { Entity as PrismaEntity } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/base.repository';
import type { CreateEntityInput } from './dto';

export type Entity = PrismaEntity;

@Injectable()
export class EntityRepository extends BaseRepository<Entity> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.entity);
  }

  /**
   * 按类型查找实体
   */
  async findByType(
    apiKeyId: string,
    userId: string,
    type: string,
  ): Promise<Entity[]> {
    return this.findMany(apiKeyId, {
      where: { userId, type },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 按名称查找实体（精确匹配）
   */
  async findByName(
    apiKeyId: string,
    userId: string,
    type: string,
    name: string,
  ): Promise<Entity | null> {
    return this.findOne(apiKeyId, { userId, type, name });
  }

  /**
   * 创建或更新实体（upsert）
   */
  async upsert(
    apiKeyId: string,
    data: CreateEntityInput & { confidence?: number },
  ): Promise<Entity> {
    return this.prisma.entity.upsert({
      where: {
        apiKeyId_userId_type_name: {
          apiKeyId,
          userId: data.userId,
          type: data.type,
          name: data.name,
        },
      },
      create: {
        apiKeyId,
        userId: data.userId,
        type: data.type,
        name: data.name,
        properties: data.properties ?? undefined,
        confidence: data.confidence,
      },
      update: {
        properties: data.properties ?? undefined,
        confidence: data.confidence,
      },
    });
  }
}

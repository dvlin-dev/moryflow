/**
 * [POS]: Relation Repository
 */

import { Injectable } from '@nestjs/common';
import type { Relation as PrismaRelation } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/base.repository';

export type Relation = PrismaRelation;

export type RelationWithEntities = Relation & {
  source: { id: string; type: string; name: string };
  target: { id: string; type: string; name: string };
};

@Injectable()
export class RelationRepository extends BaseRepository<Relation> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.relation);
  }

  /**
   * 查找实体的所有关系
   */
  async findByEntity(
    apiKeyId: string,
    entityId: string,
  ): Promise<RelationWithEntities[]> {
    return this.prisma.relation.findMany({
      where: {
        apiKeyId,
        OR: [{ sourceId: entityId }, { targetId: entityId }],
      },
      include: {
        source: { select: { id: true, type: true, name: true } },
        target: { select: { id: true, type: true, name: true } },
      },
    });
  }

  /**
   * 查找两个实体之间的关系
   */
  async findBetween(
    apiKeyId: string,
    sourceId: string,
    targetId: string,
  ): Promise<Relation[]> {
    return this.findMany(apiKeyId, {
      where: {
        OR: [
          { sourceId, targetId },
          { sourceId: targetId, targetId: sourceId },
        ],
      },
    });
  }

  /**
   * 按类型查找关系
   */
  async findByType(
    apiKeyId: string,
    userId: string,
    type: string,
  ): Promise<RelationWithEntities[]> {
    return this.prisma.relation.findMany({
      where: { apiKeyId, userId, type },
      include: {
        source: { select: { id: true, type: true, name: true } },
        target: { select: { id: true, type: true, name: true } },
      },
    });
  }

  /**
   * 列出用户的所有关系（带实体信息）
   */
  async listWithEntities(
    apiKeyId: string,
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<RelationWithEntities[]> {
    return this.prisma.relation.findMany({
      where: { apiKeyId, userId },
      include: {
        source: { select: { id: true, type: true, name: true } },
        target: { select: { id: true, type: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit ?? 100,
      skip: options.offset ?? 0,
    });
  }
}

/**
 * [POS]: Relation Repository
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/base.repository';

export interface Relation {
  id: string;
  apiKeyId: string;
  userId: string;
  sourceId: string;
  targetId: string;
  type: string;
  properties?: Record<string, any> | null;
  confidence?: number | null;
  validFrom?: Date | null;
  validTo?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RelationWithEntities extends Relation {
  source: { id: string; type: string; name: string };
  target: { id: string; type: string; name: string };
}

@Injectable()
export class RelationRepository extends BaseRepository<Relation> {
  constructor(prisma: PrismaService) {
    super(prisma, 'relation');
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
    }) as unknown as RelationWithEntities[];
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
    }) as unknown as RelationWithEntities[];
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
    }) as unknown as RelationWithEntities[];
  }
}

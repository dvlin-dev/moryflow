/**
 * [POS]: Relation Repository（向量数据库）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import type { Relation as PrismaRelation } from '../../generated/prisma-vector/client';
import { VectorPrismaService } from '../vector-prisma/vector-prisma.service';
import { BaseRepository } from '../common/base.repository';

export type Relation = PrismaRelation;

export type RelationWithEntities = Relation & {
  source: { id: string; type: string; name: string };
  target: { id: string; type: string; name: string };
};

@Injectable()
export class RelationRepository extends BaseRepository<Relation> {
  constructor(private readonly vectorPrisma: VectorPrismaService) {
    super(vectorPrisma, vectorPrisma.relation);
  }

  /**
   * 查找实体的所有关系
   */
  async findByEntity(
    apiKeyId: string,
    entityId: string,
  ): Promise<RelationWithEntities[]> {
    return this.vectorPrisma.relation.findMany({
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
    return this.vectorPrisma.relation.findMany({
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
    return this.vectorPrisma.relation.findMany({
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

  /**
   * 按用户列出所有关系（不带实体信息，用于图谱查询）
   */
  async findByUser(
    apiKeyId: string,
    userId: string,
    options: { limit?: number } = {},
  ): Promise<Relation[]> {
    return this.vectorPrisma.relation.findMany({
      where: { apiKeyId, userId },
      take: options.limit ?? 1000,
    });
  }
}

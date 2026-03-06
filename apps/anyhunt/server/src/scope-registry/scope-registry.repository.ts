/**
 * [POS]: ScopeRegistry Repository
 *
 * 职责：ScopeRegistry 数据访问层（user/agent/app/run），JSON 字段需要显式处理 null
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type ScopeRegistry as PrismaScopeRegistry,
} from '../../generated/prisma-vector/client';
import { VectorPrismaService } from '../vector-prisma/vector-prisma.service';
import { BaseRepository } from '../common/base.repository';

export type ScopeRegistryRecord = PrismaScopeRegistry;

@Injectable()
export class ScopeRegistryRepository extends BaseRepository<ScopeRegistryRecord> {
  constructor(private readonly vectorPrisma: VectorPrismaService) {
    super(vectorPrisma, vectorPrisma.scopeRegistry);
  }

  async upsert(
    apiKeyId: string,
    data: {
      type: string;
      entityId: string;
      name?: string | null;
      metadata?: Record<string, unknown> | null;
      orgId?: string | null;
      projectId?: string | null;
    },
  ): Promise<ScopeRegistryRecord> {
    const metadata = data.metadata
      ? (data.metadata as Prisma.InputJsonValue)
      : Prisma.DbNull;

    return this.vectorPrisma.scopeRegistry.upsert({
      where: {
        apiKeyId_type_entityId: {
          apiKeyId,
          type: data.type,
          entityId: data.entityId,
        },
      },
      update: {
        name: data.name ?? null,
        metadata,
        orgId: data.orgId ?? null,
        projectId: data.projectId ?? null,
      },
      create: {
        apiKeyId,
        type: data.type,
        entityId: data.entityId,
        name: data.name ?? null,
        metadata,
        orgId: data.orgId ?? null,
        projectId: data.projectId ?? null,
      },
    });
  }
}

/**
 * [INPUT]: apiKeyId, CreateRelationDto, relation queries
 * [OUTPUT]: Relation, RelationWithEntities[], pagination data
 * [POS]: Relation business logic layer - manages relationships between entities in knowledge graph
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and apps/server/src/relation/CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { RelationRepository, Relation, RelationWithEntities } from './relation.repository';
import { CreateRelationDto } from './dto';

@Injectable()
export class RelationService {
  private readonly logger = new Logger(RelationService.name);

  constructor(private readonly repository: RelationRepository) {}

  /**
   * 创建关系
   */
  async create(apiKeyId: string, dto: CreateRelationDto): Promise<Relation> {
    const relation = await this.repository.create(apiKeyId, {
      userId: dto.userId,
      sourceId: dto.sourceId,
      targetId: dto.targetId,
      type: dto.type,
      properties: dto.properties,
      confidence: dto.confidence ?? 1.0,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
      validTo: dto.validTo ? new Date(dto.validTo) : null,
    });

    this.logger.log(`Created relation ${relation.id}: ${dto.type}`);
    return relation;
  }

  /**
   * 批量创建关系
   */
  async createMany(apiKeyId: string, dtos: CreateRelationDto[]): Promise<Relation[]> {
    const relations: Relation[] = [];
    for (const dto of dtos) {
      const relation = await this.create(apiKeyId, dto);
      relations.push(relation);
    }
    return relations;
  }

  /**
   * 列出用户的关系
   */
  async list(
    apiKeyId: string,
    userId: string,
    options: { type?: string; limit?: number; offset?: number } = {},
  ): Promise<RelationWithEntities[]> {
    if (options.type) {
      return this.repository.findByType(apiKeyId, userId, options.type);
    }

    // 默认列出所有关系（带实体信息）
    return this.repository.listWithEntities(apiKeyId, userId, {
      limit: options.limit,
      offset: options.offset,
    });
  }

  /**
   * 获取实体的所有关系
   */
  async getByEntity(apiKeyId: string, entityId: string): Promise<RelationWithEntities[]> {
    return this.repository.findByEntity(apiKeyId, entityId);
  }

  /**
   * 获取两个实体之间的关系
   */
  async getBetween(
    apiKeyId: string,
    sourceId: string,
    targetId: string,
  ): Promise<Relation[]> {
    return this.repository.findBetween(apiKeyId, sourceId, targetId);
  }

  /**
   * 删除关系
   */
  async delete(apiKeyId: string, id: string): Promise<void> {
    await this.repository.deleteById(apiKeyId, id);
    this.logger.log(`Deleted relation ${id}`);
  }
}

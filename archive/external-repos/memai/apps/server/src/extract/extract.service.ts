/**
 * [INPUT]: apiKeyId, text content, ExtractOptions
 * [OUTPUT]: ExtractionResult { entities, relations, rawExtraction }
 * [POS]: LLM-powered extraction service - extracts entities and relations from unstructured text
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and apps/server/src/extract/CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { LlmService, ExtractedEntity, ExtractedRelation } from '../llm/llm.service';
import { EntityService } from '../entity/entity.service';
import { RelationService } from '../relation/relation.service';
import { Entity } from '../entity/entity.repository';
import { Relation } from '../relation/relation.repository';

export interface ExtractionResult {
  entities: Entity[];
  relations: Relation[];
  rawExtraction: {
    entities: ExtractedEntity[];
    relations: ExtractedRelation[];
  };
}

export interface ExtractOptions {
  userId: string;
  entityTypes?: string[];
  relationTypes?: string[];
  minConfidence?: number;
  saveToGraph?: boolean;
}

@Injectable()
export class ExtractService {
  private readonly logger = new Logger(ExtractService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly entityService: EntityService,
    private readonly relationService: RelationService,
  ) {}

  /**
   * 从文本中提取实体和关系
   */
  async extractFromText(
    apiKeyId: string,
    text: string,
    options: ExtractOptions,
  ): Promise<ExtractionResult> {
    const { userId, entityTypes, relationTypes, minConfidence = 0.5, saveToGraph = true } = options;

    this.logger.log(`Extracting entities and relations for user ${userId}`);

    // 使用 LLM 提取实体和关系
    const extraction = await this.llmService.extractEntitiesAndRelations(text, {
      entityTypes,
      relationTypes,
    });

    // 过滤低置信度的结果
    const filteredEntities = extraction.entities.filter(
      (e) => (e.confidence ?? 1) >= minConfidence,
    );
    const filteredRelations = extraction.relations.filter(
      (r) => (r.confidence ?? 1) >= minConfidence,
    );

    if (!saveToGraph) {
      return {
        entities: [],
        relations: [],
        rawExtraction: {
          entities: filteredEntities,
          relations: filteredRelations,
        },
      };
    }

    // 保存实体到数据库
    const entityNameToId = new Map<string, string>();
    const savedEntities: Entity[] = [];

    for (const extractedEntity of filteredEntities) {
      const entity = await this.entityService.upsert(apiKeyId, {
        userId,
        type: extractedEntity.type,
        name: extractedEntity.name,
        properties: extractedEntity.properties,
      });
      entityNameToId.set(extractedEntity.name.toLowerCase(), entity.id);
      savedEntities.push(entity);
    }

    // 保存关系到数据库
    const savedRelations: Relation[] = [];

    for (const extractedRelation of filteredRelations) {
      const sourceId = entityNameToId.get(extractedRelation.source.toLowerCase());
      const targetId = entityNameToId.get(extractedRelation.target.toLowerCase());

      if (!sourceId || !targetId) {
        this.logger.warn(
          `Skipping relation ${extractedRelation.type}: missing entity (source: ${extractedRelation.source}, target: ${extractedRelation.target})`,
        );
        continue;
      }

      const relation = await this.relationService.create(apiKeyId, {
        userId,
        sourceId,
        targetId,
        type: extractedRelation.type,
        properties: extractedRelation.properties,
        confidence: extractedRelation.confidence,
      });
      savedRelations.push(relation);
    }

    this.logger.log(
      `Extracted ${savedEntities.length} entities and ${savedRelations.length} relations`,
    );

    return {
      entities: savedEntities,
      relations: savedRelations,
      rawExtraction: {
        entities: filteredEntities,
        relations: filteredRelations,
      },
    };
  }

  /**
   * 从多段文本批量提取
   */
  async extractFromTexts(
    apiKeyId: string,
    texts: string[],
    options: ExtractOptions,
  ): Promise<ExtractionResult> {
    const allEntities: Entity[] = [];
    const allRelations: Relation[] = [];
    const allRawEntities: ExtractedEntity[] = [];
    const allRawRelations: ExtractedRelation[] = [];

    for (const text of texts) {
      const result = await this.extractFromText(apiKeyId, text, options);
      allEntities.push(...result.entities);
      allRelations.push(...result.relations);
      allRawEntities.push(...result.rawExtraction.entities);
      allRawRelations.push(...result.rawExtraction.relations);
    }

    return {
      entities: allEntities,
      relations: allRelations,
      rawExtraction: {
        entities: allRawEntities,
        relations: allRawRelations,
      },
    };
  }
}

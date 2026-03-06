/**
 * [INPUT]: apiKeyId + source identity payloads
 * [OUTPUT]: KnowledgeSource records
 * [POS]: Sources 身份资源服务
 */

import { Injectable } from '@nestjs/common';
import { KnowledgeSourceRepository } from './knowledge-source.repository';
import type { CreateKnowledgeSourceInput } from './sources.types';

@Injectable()
export class KnowledgeSourceService {
  constructor(private readonly repository: KnowledgeSourceRepository) {}

  async create(apiKeyId: string, input: CreateKnowledgeSourceInput) {
    return this.repository.createSource(apiKeyId, input);
  }

  async getById(apiKeyId: string, sourceId: string) {
    return this.repository.getRequired(apiKeyId, sourceId);
  }
}

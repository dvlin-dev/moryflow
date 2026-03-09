/**
 * [INPUT]: apiKeyId + source identity payloads
 * [OUTPUT]: KnowledgeSource records
 * [POS]: Sources 身份资源服务
 */

import { Injectable } from '@nestjs/common';
import { KnowledgeSourceRepository } from './knowledge-source.repository';
import type {
  CreateKnowledgeSourceInput,
  ResolveSourceIdentityInput,
} from './sources.types';

@Injectable()
export class KnowledgeSourceService {
  constructor(private readonly repository: KnowledgeSourceRepository) {}

  async create(apiKeyId: string, input: CreateKnowledgeSourceInput) {
    return this.repository.createSource(apiKeyId, input);
  }

  async resolveIdentity(
    apiKeyId: string,
    sourceType: string,
    externalId: string,
    input: ResolveSourceIdentityInput,
  ) {
    return this.repository.resolveSourceIdentity(
      apiKeyId,
      sourceType,
      externalId,
      input,
    );
  }

  async getById(apiKeyId: string, sourceId: string) {
    return this.repository.getRequired(apiKeyId, sourceId);
  }
}

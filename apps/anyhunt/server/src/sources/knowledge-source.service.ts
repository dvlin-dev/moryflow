/**
 * [INPUT]: apiKeyId + source identity payloads
 * [OUTPUT]: KnowledgeSource records
 * [POS]: Sources 身份资源服务
 */

import { Injectable } from '@nestjs/common';
import { KnowledgeSourceRepository } from './knowledge-source.repository';
import type {
  CreateKnowledgeSourceInput,
  LookupSourceIdentityInput,
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

  async getIdentity(
    apiKeyId: string,
    sourceType: string,
    externalId: string,
    input: LookupSourceIdentityInput,
  ) {
    return this.repository.getSourceIdentity(
      apiKeyId,
      sourceType,
      externalId,
      input,
    );
  }

  async getById(apiKeyId: string, sourceId: string) {
    return this.repository.getRequired(apiKeyId, sourceId);
  }

  async recordLatestRevision(
    apiKeyId: string,
    sourceId: string,
    revisionId: string,
  ) {
    return this.repository.recordLatestRevision(apiKeyId, sourceId, revisionId);
  }

  async activateRevision(
    apiKeyId: string,
    sourceId: string,
    revisionId: string,
  ) {
    return this.repository.activateRevision(apiKeyId, sourceId, revisionId);
  }
}

/**
 * [INPUT]: requested modelId (optional; fallback to Admin default by purpose)
 * [OUTPUT]: ResolvedLlmRoute（确定 provider + upstreamModelId + AI SDK Model/ModelProvider 实例）
 * [POS]: 运行时 LLM 路由器：将“对外 modelId”映射为“上游 upstreamId”，并加载对应 provider 的密钥/baseUrl
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { aisdk } from '@openai/agents-extensions';
import type { Model, ModelProvider } from '@openai/agents-core';
import type { ResolvedLlmRoute } from './llm.types';
import type { LlmPurpose } from './llm-upstream-resolver.service';
import {
  LlmLanguageModelService,
  type LlmThinkingSelection,
} from './llm-language-model.service';

class StaticModelProvider implements ModelProvider {
  constructor(private readonly model: Model) {}

  getModel(modelName?: string): Model {
    void modelName;
    return this.model;
  }
}

@Injectable()
export class LlmRoutingService {
  constructor(private readonly models: LlmLanguageModelService) {}

  private async resolveModelInternal(params: {
    requestedModelId?: string;
    purpose: LlmPurpose;
    thinking?: LlmThinkingSelection;
  }): Promise<ResolvedLlmRoute> {
    const resolved = await this.models.resolveModel(params);
    const model = aisdk(resolved.model);
    const modelProvider = new StaticModelProvider(model);

    return {
      requestedModelId: resolved.requestedModelId,
      provider: {
        id: resolved.provider.id,
        providerType: resolved.provider.providerType,
        name: resolved.provider.name,
        baseUrl: resolved.provider.baseUrl,
      },
      upstreamModelId: resolved.upstreamModelId,
      modelConfig: resolved.modelConfig,
      modelProvider,
      model,
    };
  }

  resolveAgentModel(
    requestedModelId?: string,
    options?: { thinking?: LlmThinkingSelection },
  ): Promise<ResolvedLlmRoute> {
    return this.resolveModelInternal({
      requestedModelId,
      purpose: 'agent',
      thinking: options?.thinking,
    });
  }

  resolveExtractModel(requestedModelId?: string): Promise<ResolvedLlmRoute> {
    return this.resolveModelInternal({ requestedModelId, purpose: 'extract' });
  }
}

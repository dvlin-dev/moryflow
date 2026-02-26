/**
 * [INPUT]: 读取启用的 LLM Provider/Model 配置
 * [OUTPUT]: Agent 模型列表与默认模型 ID
 * [POS]: Agent 公网模型列表服务（供 Console 选择模型）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_LLM_AGENT_MODEL_ID } from '../llm/llm.constants';
import {
  buildThinkingProfileFromCapabilities,
  toPublicThinkingProfile,
} from '../llm/thinking-profile.util';

@Injectable()
export class AgentModelService {
  constructor(private readonly prisma: PrismaService) {}

  async listModels() {
    const models = await this.prisma.llmModel.findMany({
      where: {
        enabled: true,
        provider: { enabled: true },
      },
      include: {
        provider: true,
      },
      orderBy: [{ modelId: 'asc' }, { provider: { sortOrder: 'desc' } }],
    });

    const byModelId = new Map<string, (typeof models)[number]>();
    for (const model of models) {
      const existing = byModelId.get(model.modelId);
      if (!existing) {
        byModelId.set(model.modelId, model);
        continue;
      }
      if (model.provider.sortOrder > existing.provider.sortOrder) {
        byModelId.set(model.modelId, model);
        continue;
      }
      if (
        model.provider.sortOrder === existing.provider.sortOrder &&
        model.provider.id.localeCompare(existing.provider.id) < 0
      ) {
        byModelId.set(model.modelId, model);
      }
    }

    const selected = Array.from(byModelId.values());
    const defaultSettings = await this.prisma.llmSettings.findUnique({
      where: { id: 'default' },
      select: { defaultAgentModelId: true },
    });
    const defaultModelId =
      defaultSettings?.defaultAgentModelId ?? DEFAULT_LLM_AGENT_MODEL_ID;

    return {
      defaultModelId,
      models: selected.map((model) => ({
        modelId: model.modelId,
        displayName: model.displayName,
        providerName: model.provider.name,
        providerType: model.provider.providerType,
        inputTokenPrice: model.inputTokenPrice,
        outputTokenPrice: model.outputTokenPrice,
        minTier: model.minTier,
        maxContextTokens: model.maxContextTokens,
        maxOutputTokens: model.maxOutputTokens,
        capabilitiesJson: model.capabilitiesJson,
        thinkingProfile: toPublicThinkingProfile(
          buildThinkingProfileFromCapabilities({
            providerType: model.provider.providerType,
            capabilitiesJson: model.capabilitiesJson,
          }),
        ),
      })),
    };
  }
}

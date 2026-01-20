/**
 * [INPUT]: requested modelId (optional; fallback to Admin default)
 * [OUTPUT]: ResolvedLlmRoute（确定 provider + upstreamModelId + Model 实例）
 * [POS]: 运行时 LLM 路由器：将“对外 modelId”映射为“上游 upstreamId”，并加载对应 provider 的密钥/baseUrl
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { OpenAIProvider } from '@anyhunt/agents-openai';
import type { Model } from '@anyhunt/agents-core';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_LLM_SETTINGS_ID } from './llm.constants';
import { LlmSecretService } from './llm-secret.service';
import type { ResolvedLlmRoute } from './llm.types';
import type { LlmProviderType } from './dto';

type Candidate = {
  upstreamId: string;
  provider: {
    id: string;
    providerType: LlmProviderType;
    name: string;
    baseUrl: string | null;
    apiKeyEncrypted: string;
    sortOrder: number;
  };
};

function normalizeRequestedModelId(modelId?: string): string | null {
  const value = modelId?.trim();
  return value ? value : null;
}

@Injectable()
export class LlmRoutingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secrets: LlmSecretService,
  ) {}

  private async getSettings(): Promise<{
    defaultModelId: string;
  }> {
    const settings = await this.prisma.llmSettings.findUnique({
      where: { id: DEFAULT_LLM_SETTINGS_ID },
      select: { defaultModelId: true },
    });

    if (!settings) {
      throw new InternalServerErrorException(
        'LLM settings are not initialized',
      );
    }

    return settings;
  }

  private async listCandidates(modelId: string): Promise<Candidate[]> {
    const models = await this.prisma.llmModel.findMany({
      where: {
        modelId,
        enabled: true,
        provider: { enabled: true },
      },
      select: {
        upstreamId: true,
        provider: {
          select: {
            id: true,
            providerType: true,
            name: true,
            baseUrl: true,
            apiKeyEncrypted: true,
            sortOrder: true,
          },
        },
      },
    });

    return models.map((m) => ({
      upstreamId: m.upstreamId,
      provider: {
        id: m.provider.id,
        providerType: m.provider.providerType as LlmProviderType,
        name: m.provider.name,
        baseUrl: m.provider.baseUrl,
        apiKeyEncrypted: m.provider.apiKeyEncrypted,
        sortOrder: m.provider.sortOrder,
      },
    }));
  }

  private selectCandidateOrThrow(candidates: Candidate[]): Candidate {
    if (candidates.length === 1) {
      return candidates[0];
    }

    // 优先选择 sortOrder 最大的 provider；相同 sortOrder 时按 providerId 兜底，保证确定性。
    return candidates.slice().sort((a, b) => {
      if (a.provider.sortOrder !== b.provider.sortOrder) {
        return b.provider.sortOrder - a.provider.sortOrder;
      }
      return a.provider.id.localeCompare(b.provider.id);
    })[0];
  }

  private buildModelProviderOrThrow(params: {
    providerType: LlmProviderType;
    apiKey: string;
    baseUrl: string | null;
  }): { getModel: (modelName?: string) => Promise<Model> } {
    const { providerType, apiKey, baseUrl } = params;

    if (
      providerType === 'openai' ||
      providerType === 'openai_compatible' ||
      providerType === 'openrouter'
    ) {
      return new OpenAIProvider({
        apiKey,
        baseURL: baseUrl ?? undefined,
        useResponses: false,
      });
    }

    throw new BadRequestException('LLM provider type is not supported');
  }

  async resolveModel(requestedModelId?: string): Promise<ResolvedLlmRoute> {
    const settings = await this.getSettings();
    const effectiveModelId =
      normalizeRequestedModelId(requestedModelId) ?? settings.defaultModelId;

    const candidates = await this.listCandidates(effectiveModelId);
    if (candidates.length === 0) {
      throw new BadRequestException('Model is not available');
    }

    const selected = this.selectCandidateOrThrow(candidates);

    let apiKey: string;
    try {
      apiKey = this.secrets.decryptApiKey(selected.provider.apiKeyEncrypted);
    } catch {
      throw new InternalServerErrorException(
        'LLM provider apiKey is not readable',
      );
    }

    const provider = this.buildModelProviderOrThrow({
      providerType: selected.provider.providerType,
      apiKey,
      baseUrl: selected.provider.baseUrl,
    });

    const model = await provider.getModel(selected.upstreamId);

    return {
      requestedModelId: effectiveModelId,
      provider: {
        id: selected.provider.id,
        providerType: selected.provider.providerType,
        name: selected.provider.name,
        baseUrl: selected.provider.baseUrl,
      },
      upstreamModelId: selected.upstreamId,
      model,
    };
  }
}

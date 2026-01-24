/**
 * [INPUT]: requested modelId (optional) + purpose (agent/extract)
 * [OUTPUT]: resolved upstream config（provider meta + upstreamModelId + decrypted apiKey）
 * [POS]: LLM 路由的共享解析器：只负责“查库 + 选路由 + 解密密钥”，不创建 SDK/Model 实例
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_LLM_AGENT_MODEL_ID,
  DEFAULT_LLM_EXTRACT_MODEL_ID,
  DEFAULT_LLM_SETTINGS_ID,
} from './llm.constants';
import { LlmSecretService } from './llm-secret.service';
import type { LlmProviderType } from './dto';

export type LlmPurpose = 'agent' | 'extract';

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
export class LlmUpstreamResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secrets: LlmSecretService,
  ) {}

  private async getSettings(): Promise<{
    defaultAgentModelId: string;
    defaultExtractModelId: string;
  }> {
    return this.prisma.llmSettings.upsert({
      where: { id: DEFAULT_LLM_SETTINGS_ID },
      create: {
        id: DEFAULT_LLM_SETTINGS_ID,
        defaultAgentModelId: DEFAULT_LLM_AGENT_MODEL_ID,
        defaultExtractModelId: DEFAULT_LLM_EXTRACT_MODEL_ID,
      },
      update: {},
      select: { defaultAgentModelId: true, defaultExtractModelId: true },
    });
  }

  private getDefaultModelIdOrThrow(
    settings: {
      defaultAgentModelId: string;
      defaultExtractModelId: string;
    },
    purpose: LlmPurpose,
  ): string {
    if (purpose === 'agent') {
      return settings.defaultAgentModelId;
    }
    if (purpose === 'extract') {
      return settings.defaultExtractModelId;
    }
    throw new BadRequestException('LLM purpose is not supported');
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

  async resolveUpstream(params: {
    requestedModelId?: string;
    purpose: LlmPurpose;
  }): Promise<{
    requestedModelId: string;
    upstreamModelId: string;
    provider: {
      id: string;
      providerType: LlmProviderType;
      name: string;
      baseUrl: string | null;
    };
    apiKey: string;
  }> {
    const settings = await this.getSettings();
    const defaultModelId = this.getDefaultModelIdOrThrow(
      settings,
      params.purpose,
    );
    const effectiveModelId =
      normalizeRequestedModelId(params.requestedModelId) ?? defaultModelId;

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

    return {
      requestedModelId: effectiveModelId,
      upstreamModelId: selected.upstreamId,
      provider: {
        id: selected.provider.id,
        providerType: selected.provider.providerType,
        name: selected.provider.name,
        baseUrl: selected.provider.baseUrl,
      },
      apiKey,
    };
  }
}

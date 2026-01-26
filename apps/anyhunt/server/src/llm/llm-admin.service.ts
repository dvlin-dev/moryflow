/**
 * [INPUT]: Admin DTOs (provider/model/settings)
 * [OUTPUT]: Provider/Model/Settings 列表与详情（不包含明文 apiKey）
 * [POS]: Admin 管理 LLM Providers/Models 的核心服务（CRUD + 校验）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PRESET_LLM_PROVIDERS,
  DEFAULT_LLM_AGENT_MODEL_ID,
  DEFAULT_LLM_EXTRACT_MODEL_ID,
  DEFAULT_LLM_SETTINGS_ID,
} from './llm.constants';
import { LlmSecretService } from './llm-secret.service';
import type { Prisma } from '../../generated/prisma-main/client';
import type {
  CreateLlmProviderDto,
  UpdateLlmProviderDto,
  CreateLlmModelDto,
  UpdateLlmModelDto,
  UpdateLlmSettingsDto,
} from './dto';
import type {
  LlmProviderListItem,
  LlmModelListItem,
  LlmSettingsDto,
} from './llm.types';

@Injectable()
export class LlmAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secrets: LlmSecretService,
  ) {}

  private async countEnabledMappingsForModelId(params: {
    modelId: string;
    excludeProviderId?: string;
    excludeModelRecordId?: string;
  }): Promise<number> {
    const { modelId, excludeProviderId, excludeModelRecordId } = params;

    return this.prisma.llmModel.count({
      where: {
        modelId,
        enabled: true,
        provider: { enabled: true },
        ...(excludeProviderId
          ? { providerId: { not: excludeProviderId } }
          : {}),
        ...(excludeModelRecordId ? { id: { not: excludeModelRecordId } } : {}),
      },
    });
  }

  private async assertDefaultModelNotBrokenByRemoval(params: {
    excludeProviderId?: string;
    excludeModelRecordId?: string;
  }): Promise<void> {
    const settings = await this.getSettings();
    const defaultModelIds = [
      settings.defaultAgentModelId,
      settings.defaultExtractModelId,
    ];

    for (const modelId of defaultModelIds) {
      const before = await this.countEnabledMappingsForModelId({
        modelId,
      });
      if (before === 0) {
        continue;
      }

      const after = await this.countEnabledMappingsForModelId({
        modelId,
        excludeProviderId: params.excludeProviderId,
        excludeModelRecordId: params.excludeModelRecordId,
      });

      if (after === 0) {
        throw new BadRequestException(
          'Operation would make default model unavailable. Update default models or add another enabled mapping first.',
        );
      }
    }
  }

  async getSettings(): Promise<LlmSettingsDto> {
    const existing = await this.prisma.llmSettings.findUnique({
      where: { id: DEFAULT_LLM_SETTINGS_ID },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.llmSettings.create({
      data: {
        id: DEFAULT_LLM_SETTINGS_ID,
        defaultAgentModelId: DEFAULT_LLM_AGENT_MODEL_ID,
        defaultExtractModelId: DEFAULT_LLM_EXTRACT_MODEL_ID,
      },
    });
  }

  private async assertModelAvailable(modelId: string): Promise<void> {
    const exists = await this.prisma.llmModel.findFirst({
      where: {
        modelId,
        enabled: true,
        provider: { enabled: true },
      },
      select: { id: true },
    });

    if (!exists) {
      throw new BadRequestException(
        'Model is not available (no enabled provider/model mapping found)',
      );
    }
  }

  async updateSettings(dto: UpdateLlmSettingsDto): Promise<LlmSettingsDto> {
    await this.assertModelAvailable(dto.defaultAgentModelId);
    await this.assertModelAvailable(dto.defaultExtractModelId);

    return this.prisma.llmSettings.upsert({
      where: { id: DEFAULT_LLM_SETTINGS_ID },
      create: {
        id: DEFAULT_LLM_SETTINGS_ID,
        defaultAgentModelId: dto.defaultAgentModelId,
        defaultExtractModelId: dto.defaultExtractModelId,
      },
      update: {
        defaultAgentModelId: dto.defaultAgentModelId,
        defaultExtractModelId: dto.defaultExtractModelId,
      },
    });
  }

  getPresetProviders() {
    return { providers: PRESET_LLM_PROVIDERS };
  }

  async listProviders(): Promise<LlmProviderListItem[]> {
    const providers = await this.prisma.llmProvider.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return providers.map((p) => ({
      id: p.id,
      providerType: p.providerType,
      name: p.name,
      baseUrl: p.baseUrl,
      enabled: p.enabled,
      sortOrder: p.sortOrder,
      apiKeyStatus: 'set',
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  async createProvider(
    dto: CreateLlmProviderDto,
  ): Promise<LlmProviderListItem> {
    const apiKeyEncrypted = this.secrets.encryptApiKey(dto.apiKey);
    const created = await this.prisma.llmProvider.create({
      data: {
        providerType: dto.providerType,
        name: dto.name,
        apiKeyEncrypted,
        baseUrl: dto.baseUrl ?? null,
        enabled: dto.enabled ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return {
      id: created.id,
      providerType: created.providerType,
      name: created.name,
      baseUrl: created.baseUrl,
      enabled: created.enabled,
      sortOrder: created.sortOrder,
      apiKeyStatus: 'set',
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async updateProvider(
    providerId: string,
    dto: UpdateLlmProviderDto,
  ): Promise<LlmProviderListItem> {
    if (dto.enabled === false) {
      await this.assertDefaultModelNotBrokenByRemoval({
        excludeProviderId: providerId,
      });
    }

    const apiKeyEncrypted =
      dto.apiKey !== undefined
        ? this.secrets.encryptApiKey(dto.apiKey)
        : undefined;

    const updated = await this.prisma.llmProvider.update({
      where: { id: providerId },
      data: {
        name: dto.name,
        baseUrl: dto.baseUrl === undefined ? undefined : dto.baseUrl,
        enabled: dto.enabled,
        sortOrder: dto.sortOrder,
        ...(apiKeyEncrypted ? { apiKeyEncrypted } : {}),
      },
    });

    return {
      id: updated.id,
      providerType: updated.providerType,
      name: updated.name,
      baseUrl: updated.baseUrl,
      enabled: updated.enabled,
      sortOrder: updated.sortOrder,
      apiKeyStatus: 'set',
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteProvider(providerId: string): Promise<void> {
    await this.assertDefaultModelNotBrokenByRemoval({
      excludeProviderId: providerId,
    });

    await this.prisma.llmProvider.delete({ where: { id: providerId } });
  }

  async listModels(): Promise<LlmModelListItem[]> {
    const models = await this.prisma.llmModel.findMany({
      include: { provider: true },
      orderBy: [{ sortOrder: 'asc' }, { modelId: 'asc' }],
    });

    return models.map((m) => ({
      id: m.id,
      providerId: m.providerId,
      providerName: m.provider.name,
      providerType: m.provider.providerType,
      modelId: m.modelId,
      upstreamId: m.upstreamId,
      displayName: m.displayName,
      inputTokenPrice: m.inputTokenPrice,
      outputTokenPrice: m.outputTokenPrice,
      minTier: m.minTier,
      maxContextTokens: m.maxContextTokens,
      maxOutputTokens: m.maxOutputTokens,
      capabilitiesJson: m.capabilitiesJson,
      sortOrder: m.sortOrder,
      enabled: m.enabled,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));
  }

  async createModel(dto: CreateLlmModelDto): Promise<LlmModelListItem> {
    const capabilitiesJson = {
      vision: dto.capabilities?.vision ?? false,
      tools: dto.capabilities?.tools ?? false,
      json: dto.capabilities?.json ?? false,
      maxContextTokens: dto.maxContextTokens,
      maxOutputTokens: dto.maxOutputTokens,
      reasoning: dto.reasoning ?? { enabled: false },
    };

    const capabilitiesJsonValue = JSON.parse(
      JSON.stringify(capabilitiesJson),
    ) as Prisma.InputJsonValue;

    const created = await this.prisma.llmModel.create({
      data: {
        providerId: dto.providerId,
        modelId: dto.modelId,
        upstreamId: dto.upstreamId,
        displayName: dto.displayName,
        enabled: dto.enabled ?? true,
        inputTokenPrice: dto.inputTokenPrice,
        outputTokenPrice: dto.outputTokenPrice,
        minTier: dto.minTier,
        maxContextTokens: dto.maxContextTokens,
        maxOutputTokens: dto.maxOutputTokens,
        capabilitiesJson: capabilitiesJsonValue,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { provider: true },
    });

    return {
      id: created.id,
      providerId: created.providerId,
      providerName: created.provider.name,
      providerType: created.provider.providerType,
      modelId: created.modelId,
      upstreamId: created.upstreamId,
      displayName: created.displayName,
      inputTokenPrice: created.inputTokenPrice,
      outputTokenPrice: created.outputTokenPrice,
      minTier: created.minTier,
      maxContextTokens: created.maxContextTokens,
      maxOutputTokens: created.maxOutputTokens,
      capabilitiesJson: created.capabilitiesJson,
      sortOrder: created.sortOrder,
      enabled: created.enabled,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async updateModel(
    modelId: string,
    dto: UpdateLlmModelDto,
  ): Promise<LlmModelListItem> {
    const settings = await this.getSettings();
    const current = await this.prisma.llmModel.findUnique({
      where: { id: modelId },
      select: {
        modelId: true,
        enabled: true,
        capabilitiesJson: true,
        provider: { select: { enabled: true, name: true, providerType: true } },
      },
    });

    if (!current) {
      throw new BadRequestException('LLM model not found');
    }

    const isDefaultModel =
      current.modelId === settings.defaultAgentModelId ||
      current.modelId === settings.defaultExtractModelId;
    const wouldRemoveDefaultMapping =
      isDefaultModel &&
      current.enabled === true &&
      current.provider.enabled === true &&
      (dto.enabled === false ||
        (dto.modelId !== undefined && dto.modelId !== current.modelId));

    if (wouldRemoveDefaultMapping) {
      await this.assertDefaultModelNotBrokenByRemoval({
        excludeModelRecordId: modelId,
      });
    }

    const updateData: Record<string, unknown> = { ...dto };
    delete updateData.capabilities;
    delete updateData.reasoning;

    if (
      dto.capabilities ||
      dto.reasoning ||
      dto.maxContextTokens !== undefined ||
      dto.maxOutputTokens !== undefined
    ) {
      const existingCaps =
        (current.capabilitiesJson as Record<string, unknown> | null) ?? {};
      const nextCaps = {
        ...existingCaps,
        ...(dto.capabilities ?? {}),
        maxContextTokens: dto.maxContextTokens ?? existingCaps.maxContextTokens,
        maxOutputTokens: dto.maxOutputTokens ?? existingCaps.maxOutputTokens,
        ...(dto.reasoning && { reasoning: dto.reasoning }),
      };
      updateData.capabilitiesJson = JSON.parse(
        JSON.stringify(nextCaps),
      ) as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.llmModel.update({
      where: { id: modelId },
      data: updateData,
      include: { provider: true },
    });

    return {
      id: updated.id,
      providerId: updated.providerId,
      providerName: updated.provider.name,
      providerType: updated.provider.providerType,
      modelId: updated.modelId,
      upstreamId: updated.upstreamId,
      displayName: updated.displayName,
      inputTokenPrice: updated.inputTokenPrice,
      outputTokenPrice: updated.outputTokenPrice,
      minTier: updated.minTier,
      maxContextTokens: updated.maxContextTokens,
      maxOutputTokens: updated.maxOutputTokens,
      capabilitiesJson: updated.capabilitiesJson,
      sortOrder: updated.sortOrder,
      enabled: updated.enabled,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteModel(modelId: string): Promise<void> {
    await this.assertDefaultModelNotBrokenByRemoval({
      excludeModelRecordId: modelId,
    });

    await this.prisma.llmModel.delete({ where: { id: modelId } });
  }
}

/**
 * AI Admin Service
 * AI Provider 和 Model 配置管理
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type {
  CreateProviderDto,
  UpdateProviderDto,
  CreateModelDto,
  UpdateModelDto,
} from './dto';

// 预设 Provider 配置
export const PRESET_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    sdkType: 'openai',
    defaultBaseUrl: 'https://api.openai.com/v1',
    docUrl: 'https://platform.openai.com/docs/api-reference',
    description: 'GPT-4, GPT-3.5 等模型',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    sdkType: 'anthropic',
    defaultBaseUrl: 'https://api.anthropic.com',
    docUrl: 'https://docs.anthropic.com/claude/reference',
    description: 'Claude 3.5, Claude 3 等模型',
  },
  {
    id: 'google',
    name: 'Google AI',
    sdkType: 'google',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    docUrl:
      'https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini',
    description: 'Gemini Pro, Gemini Ultra 等模型',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    sdkType: 'openrouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    docUrl: 'https://openrouter.ai/docs',
    description: '多模型聚合平台，支持深度推理',
  },
  {
    id: 'zenmux',
    name: 'zenmux.ai',
    sdkType: 'openai-compatible',
    defaultBaseUrl: 'https://zenmux.ai/api/v1',
    docUrl: 'https://zenmux.ai',
    description: '多模型聚合平台',
  },
];

@Injectable()
export class AiAdminService {
  private readonly logger = new Logger(AiAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Provider 管理 ====================

  /**
   * 获取预设 Provider 列表
   */
  getPresetProviders() {
    return { providers: PRESET_PROVIDERS };
  }

  /**
   * 获取所有 Provider
   */
  async getAllProviders() {
    const providers = await this.prisma.aiProvider.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return { providers };
  }

  /**
   * 获取单个 Provider
   */
  async getProviderById(id: string) {
    const provider = await this.prisma.aiProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return { provider };
  }

  /**
   * 创建 Provider
   */
  async createProvider(data: CreateProviderDto) {
    const provider = await this.prisma.aiProvider.create({
      data: {
        providerType: data.providerType,
        name: data.name,
        apiKey: data.apiKey,
        baseUrl: data.baseUrl,
        enabled: data.enabled,
        sortOrder: data.sortOrder,
      },
    });

    this.logger.log(`Created provider: ${provider.id}`);

    return { success: true, provider };
  }

  /**
   * 更新 Provider
   */
  async updateProvider(id: string, data: UpdateProviderDto) {
    const existing = await this.prisma.aiProvider.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Provider not found');
    }

    const provider = await this.prisma.aiProvider.update({
      where: { id },
      data,
    });

    this.logger.log(`Updated provider: ${id}`);

    return { success: true, provider };
  }

  /**
   * 删除 Provider
   */
  async deleteProvider(id: string) {
    const existing = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Provider not found');
    }

    await this.prisma.aiProvider.delete({ where: { id } });
    this.logger.log(`Deleted provider: ${id}`);
    return { success: true };
  }

  // ==================== Model 管理 ====================

  /**
   * 获取所有 Model
   */
  async getAllModels(providerId?: string) {
    const models = await this.prisma.aiModel.findMany({
      where: providerId ? { providerId } : undefined,
      orderBy: { sortOrder: 'asc' },
    });

    return { models };
  }

  /**
   * 获取单个 Model
   */
  async getModelById(id: string) {
    const model = await this.prisma.aiModel.findUnique({
      where: { id },
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    return { model };
  }

  /**
   * 创建 Model
   */
  async createModel(data: CreateModelDto) {
    // 构建 capabilities JSON（包含 reasoning 配置）
    // 使用 Prisma.InputJsonValue 类型确保兼容
    const capabilitiesJson = {
      vision: data.capabilities?.vision ?? false,
      tools: data.capabilities?.tools ?? false,
      json: data.capabilities?.json ?? false,
      maxContextTokens: data.maxContextTokens,
      maxOutputTokens: data.maxOutputTokens,
      // 深度推理配置
      reasoning: data.reasoning ?? { enabled: false },
    };

    const model = await this.prisma.aiModel.create({
      data: {
        providerId: data.providerId,
        modelId: data.modelId,
        upstreamId: data.upstreamId,
        displayName: data.displayName,
        enabled: data.enabled,
        inputTokenPrice: data.inputTokenPrice,
        outputTokenPrice: data.outputTokenPrice,
        minTier: data.minTier,
        maxContextTokens: data.maxContextTokens,
        maxOutputTokens: data.maxOutputTokens,
        // 使用 JSON.parse/stringify 确保类型兼容
        capabilitiesJson: JSON.parse(JSON.stringify(capabilitiesJson)),
        sortOrder: data.sortOrder,
      },
    });

    this.logger.log(`Created model: ${model.id}`);
    return { success: true, model };
  }

  /**
   * 更新 Model
   */
  async updateModel(id: string, data: UpdateModelDto) {
    const existing = await this.prisma.aiModel.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Model not found');
    }

    // 如果有 capabilities 或 reasoning 更新，需要合并到 capabilitiesJson
    const updateData: Record<string, unknown> = { ...data };
    delete updateData.capabilities;
    delete updateData.reasoning;

    if (data.capabilities || data.reasoning) {
      const existingCaps = existing.capabilitiesJson as Record<string, unknown>;
      const newCaps = {
        ...existingCaps,
        ...(data.capabilities || {}),
        maxContextTokens:
          data.maxContextTokens ?? existingCaps.maxContextTokens,
        maxOutputTokens: data.maxOutputTokens ?? existingCaps.maxOutputTokens,
        // 合并 reasoning 配置
        ...(data.reasoning && { reasoning: data.reasoning }),
      };
      // 使用 JSON.parse/stringify 确保类型兼容
      updateData.capabilitiesJson = JSON.parse(JSON.stringify(newCaps));
    }

    const model = await this.prisma.aiModel.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Updated model: ${id}`);
    return { success: true, model };
  }

  /**
   * 删除 Model
   */
  async deleteModel(id: string) {
    const existing = await this.prisma.aiModel.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Model not found');
    }

    await this.prisma.aiModel.delete({ where: { id } });
    this.logger.log(`Deleted model: ${id}`);
    return { success: true };
  }
}

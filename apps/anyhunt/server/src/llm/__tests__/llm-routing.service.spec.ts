import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmRoutingService } from '../llm-routing.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { LlmLanguageModelService } from '../llm-language-model.service';
import { aisdk, type AiSdkModel } from '@openai/agents-extensions';

vi.mock('@openai/agents-extensions', () => ({
  aisdk: vi.fn(),
}));

function createMockModelService(params: {
  resolveModel: (args: any) => any;
}): LlmLanguageModelService {
  return {
    resolveModel: vi.fn().mockImplementation(params.resolveModel),
  } as unknown as LlmLanguageModelService;
}

describe('LlmRoutingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(aisdk).mockReturnValue({} as AiSdkModel);
  });

  it('falls back to admin defaultAgentModelId', async () => {
    const models = createMockModelService({
      resolveModel: () => ({
        model: {} as any,
        requestedModelId: 'gpt-4o',
        upstreamModelId: 'gpt-4o',
        modelConfig: {
          maxContextTokens: 128000,
          maxOutputTokens: 4096,
        },
        provider: {
          id: 'p1',
          providerType: 'openai',
          name: 'OpenAI',
          baseUrl: null,
        },
      }),
    });

    const service = new LlmRoutingService(models);
    const result = await service.resolveAgentModel(undefined);
    expect(result.requestedModelId).toBe('gpt-4o');
    expect(models.resolveModel).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'agent' }),
    );
  });

  it('uses resolved upstream model + provider meta', async () => {
    const models = createMockModelService({
      resolveModel: () => ({
        model: {} as any,
        requestedModelId: 'gpt-4o',
        upstreamModelId: 'gpt-4o',
        modelConfig: {
          maxContextTokens: 128000,
          maxOutputTokens: 4096,
        },
        provider: {
          id: 'p2',
          providerType: 'openai',
          name: 'OpenAI-2',
          baseUrl: 'https://api.openai.com/v1',
        },
      }),
    });

    const service = new LlmRoutingService(models);
    const result = await service.resolveAgentModel('gpt-4o');
    expect(result.provider.id).toBe('p2');
    expect(result.provider.baseUrl).toBe('https://api.openai.com/v1');
    expect(result.upstreamModelId).toBe('gpt-4o');
    expect(result.modelProvider.getModel()).toBe(result.model);
  });

  it('throws when model is not available', async () => {
    const models = createMockModelService({
      resolveModel: () => {
        throw new BadRequestException('Model is not available');
      },
    });
    const service = new LlmRoutingService(models);
    await expect(service.resolveAgentModel('gpt-4o')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws 500 when upstream resolver throws 500', async () => {
    const models = createMockModelService({
      resolveModel: () => {
        throw new InternalServerErrorException('boom');
      },
    });
    const service = new LlmRoutingService(models);
    await expect(service.resolveAgentModel('gpt-4o')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('falls back to admin defaultExtractModelId', async () => {
    const models = createMockModelService({
      resolveModel: () => ({
        model: {} as any,
        requestedModelId: 'gpt-4o-mini',
        upstreamModelId: 'gpt-4o-mini',
        modelConfig: {
          maxContextTokens: 128000,
          maxOutputTokens: 4096,
        },
        provider: {
          id: 'p1',
          providerType: 'openai',
          name: 'OpenAI',
          baseUrl: null,
        },
      }),
    });

    const service = new LlmRoutingService(models);
    const result = await service.resolveExtractModel(undefined);
    expect(result.requestedModelId).toBe('gpt-4o-mini');
    expect(models.resolveModel).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'extract' }),
    );
  });
});

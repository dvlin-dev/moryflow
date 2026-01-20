import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmRoutingService } from '../llm-routing.service';
import { LlmSecretService } from '../llm-secret.service';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { OpenAIProvider } from '@anyhunt/agents-openai';
import type { Model } from '@anyhunt/agents-core';

function createMockPrisma(params: {
  defaultModelId?: string;
  candidates: Array<{
    upstreamId: string;
    provider: {
      id: string;
      providerType: 'openai' | 'openai_compatible' | 'openrouter';
      name: string;
      baseUrl: string | null;
      apiKeyEncrypted: string;
      sortOrder: number;
    };
  }>;
}): PrismaService {
  const mock = {
    llmSettings: {
      findUnique: vi.fn().mockResolvedValue({
        defaultModelId: params.defaultModelId ?? 'gpt-4o',
      }),
    },
    llmModel: {
      findMany: vi.fn().mockResolvedValue(params.candidates),
    },
  };

  return mock as unknown as PrismaService;
}

describe('LlmRoutingService', () => {
  const secrets = {
    decryptApiKey: vi.fn().mockReturnValue('sk-test'),
  } as unknown as LlmSecretService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(OpenAIProvider.prototype, 'getModel').mockResolvedValue(
      {} as unknown as Model,
    );
  });

  it('falls back to admin defaultModelId', async () => {
    const prisma = createMockPrisma({
      defaultModelId: 'gpt-4o',
      candidates: [
        {
          upstreamId: 'gpt-4o',
          provider: {
            id: 'p1',
            providerType: 'openai',
            name: 'OpenAI',
            baseUrl: null,
            apiKeyEncrypted: 'enc',
            sortOrder: 0,
          },
        },
      ],
    });

    const service = new LlmRoutingService(prisma, secrets);
    const result = await service.resolveModel(undefined);
    expect(result.requestedModelId).toBe('gpt-4o');
    expect(prisma.llmModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ modelId: 'gpt-4o' }),
      }),
    );
  });

  it('selects provider by sortOrder when ambiguous', async () => {
    const prisma = createMockPrisma({
      candidates: [
        {
          upstreamId: 'gpt-4o',
          provider: {
            id: 'p1',
            providerType: 'openai',
            name: 'OpenAI-1',
            baseUrl: null,
            apiKeyEncrypted: 'enc1',
            sortOrder: 0,
          },
        },
        {
          upstreamId: 'gpt-4o',
          provider: {
            id: 'p2',
            providerType: 'openai',
            name: 'OpenAI-2',
            baseUrl: null,
            apiKeyEncrypted: 'enc2',
            sortOrder: 10,
          },
        },
      ],
    });

    const service = new LlmRoutingService(prisma, secrets);
    const result = await service.resolveModel('gpt-4o');
    expect(result.provider.id).toBe('p2');
  });

  it('throws when model is not available', async () => {
    const prisma = createMockPrisma({ candidates: [] });
    const service = new LlmRoutingService(prisma, secrets);
    await expect(service.resolveModel('gpt-4o')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws 500 when apiKey cannot be decrypted', async () => {
    const prisma = createMockPrisma({
      candidates: [
        {
          upstreamId: 'gpt-4o',
          provider: {
            id: 'p1',
            providerType: 'openai',
            name: 'OpenAI',
            baseUrl: null,
            apiKeyEncrypted: 'enc',
            sortOrder: 0,
          },
        },
      ],
    });
    const badSecrets = {
      decryptApiKey: vi.fn(() => {
        throw new Error('boom');
      }),
    } as unknown as LlmSecretService;

    const service = new LlmRoutingService(prisma, badSecrets);
    await expect(service.resolveModel('gpt-4o')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});

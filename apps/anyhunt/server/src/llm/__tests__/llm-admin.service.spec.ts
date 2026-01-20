import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { LlmSecretService } from '../llm-secret.service';
import { LlmAdminService } from '../llm-admin.service';

function createMockPrisma(params: {
  defaultAgentModelId?: string;
  defaultExtractModelId?: string;
  countImpl: (args: any) => number;
}): PrismaService {
  const defaultAgentModelId = params.defaultAgentModelId ?? 'gpt-4o';
  const defaultExtractModelId = params.defaultExtractModelId ?? 'gpt-4o-mini';
  const now = new Date();

  const mock = {
    llmSettings: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'default',
        defaultAgentModelId,
        defaultExtractModelId,
        createdAt: now,
        updatedAt: now,
      }),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    llmModel: {
      count: vi.fn().mockImplementation(async (args) => params.countImpl(args)),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    llmProvider: {
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  return mock as unknown as PrismaService;
}

describe('LlmAdminService', () => {
  const secrets = {
    encryptApiKey: vi.fn().mockReturnValue('v1:enc'),
  } as unknown as LlmSecretService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks disabling provider when it would break default model', async () => {
    const prisma = createMockPrisma({
      countImpl: ({ where }) => {
        if (where.modelId !== 'gpt-4o') return 0;
        if (where.providerId?.not === 'p1') return 0;
        return 1;
      },
    });

    const service = new LlmAdminService(prisma, secrets);
    await expect(
      service.updateProvider('p1', { enabled: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect((prisma as any).llmProvider.update).not.toHaveBeenCalled();
  });

  it('allows disabling provider when another mapping exists', async () => {
    const prisma = createMockPrisma({
      countImpl: ({ where }) => {
        if (where.modelId !== 'gpt-4o') return 0;
        if (where.providerId?.not === 'p1') return 1;
        return 2;
      },
    });

    (prisma as any).llmProvider.update = vi.fn().mockResolvedValue({
      id: 'p1',
      providerType: 'openai',
      name: 'OpenAI',
      apiKeyEncrypted: 'v1:enc',
      baseUrl: null,
      enabled: false,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const service = new LlmAdminService(prisma, secrets);
    const result = await service.updateProvider('p1', { enabled: false });
    expect(result.enabled).toBe(false);
    expect((prisma as any).llmProvider.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' } }),
    );
  });

  it('blocks disabling default model mapping when it is the last one', async () => {
    const prisma = createMockPrisma({
      countImpl: ({ where }) => {
        if (where.modelId !== 'gpt-4o') return 0;
        if (where.id?.not === 'm1') return 0;
        return 1;
      },
    });

    (prisma as any).llmModel.findUnique = vi.fn().mockResolvedValue({
      modelId: 'gpt-4o',
      enabled: true,
      provider: { enabled: true },
    });

    const service = new LlmAdminService(prisma, secrets);
    await expect(
      service.updateModel('m1', { enabled: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect((prisma as any).llmModel.update).not.toHaveBeenCalled();
  });

  it('blocks disabling provider when it would break default extract model', async () => {
    const prisma = createMockPrisma({
      defaultExtractModelId: 'gpt-4o-mini',
      countImpl: ({ where }) => {
        if (where.modelId !== 'gpt-4o-mini') return 0;
        if (where.providerId?.not === 'p1') return 0;
        return 1;
      },
    });

    const service = new LlmAdminService(prisma, secrets);
    await expect(
      service.updateProvider('p1', { enabled: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

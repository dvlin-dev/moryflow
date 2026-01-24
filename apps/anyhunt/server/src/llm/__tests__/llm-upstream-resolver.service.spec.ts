import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import type { LlmSecretService } from '../llm-secret.service';
import { LlmUpstreamResolverService } from '../llm-upstream-resolver.service';
import {
  DEFAULT_LLM_AGENT_MODEL_ID,
  DEFAULT_LLM_EXTRACT_MODEL_ID,
  DEFAULT_LLM_SETTINGS_ID,
} from '../llm.constants';

function createMockPrisma(): PrismaService {
  const mock = {
    llmSettings: {
      upsert: vi.fn().mockResolvedValue({
        id: DEFAULT_LLM_SETTINGS_ID,
        defaultAgentModelId: DEFAULT_LLM_AGENT_MODEL_ID,
        defaultExtractModelId: DEFAULT_LLM_EXTRACT_MODEL_ID,
      }),
    },
    llmModel: {
      findMany: vi.fn().mockImplementation(async ({ where }) => {
        if (where.modelId !== DEFAULT_LLM_AGENT_MODEL_ID) {
          return [];
        }
        return [
          {
            upstreamId: DEFAULT_LLM_AGENT_MODEL_ID,
            provider: {
              id: 'p1',
              providerType: 'openai',
              name: 'OpenAI',
              baseUrl: null,
              apiKeyEncrypted: 'v1:enc',
              sortOrder: 10,
            },
          },
        ];
      }),
    },
  };

  return mock as unknown as PrismaService;
}

describe('LlmUpstreamResolverService', () => {
  const secrets = {
    decryptApiKey: vi.fn().mockReturnValue('sk-test'),
  } as unknown as LlmSecretService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates settings defaults when missing and resolves upstream', async () => {
    const prisma = createMockPrisma();
    const service = new LlmUpstreamResolverService(prisma, secrets);

    const result = await service.resolveUpstream({ purpose: 'agent' });

    expect((prisma as any).llmSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DEFAULT_LLM_SETTINGS_ID },
        create: {
          id: DEFAULT_LLM_SETTINGS_ID,
          defaultAgentModelId: DEFAULT_LLM_AGENT_MODEL_ID,
          defaultExtractModelId: DEFAULT_LLM_EXTRACT_MODEL_ID,
        },
        update: {},
      }),
    );
    expect((prisma as any).llmModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ modelId: DEFAULT_LLM_AGENT_MODEL_ID }),
      }),
    );
    expect(result.upstreamModelId).toBe(DEFAULT_LLM_AGENT_MODEL_ID);
    expect(result.apiKey).toBe('sk-test');
  });
});

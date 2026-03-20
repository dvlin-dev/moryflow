import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { generateText, streamText } from 'ai';

import { AiProxyService } from './ai-proxy.service';
import { ModelProviderFactory } from './providers';
import { SSEStreamBuilder } from './stream';
import { PrismaService } from '../prisma';
import { CreditService } from '../credit';
import { ActivityLogService } from '../activity-log';
import {
  createMockAiModel,
  createMockAiProvider,
  SubscriptionTier,
} from '../testing/factories';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

describe('AiProxyService providerOptions merge', () => {
  let service: AiProxyService;
  let prismaMock: MockPrismaService;
  let creditServiceMock: {
    consumeCreditsWithDebt: ReturnType<typeof vi.fn>;
    getCreditsBalance: ReturnType<typeof vi.fn>;
  };
  let activityLogServiceMock: {
    logAiChat: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    creditServiceMock = {
      consumeCreditsWithDebt: vi.fn().mockResolvedValue({
        consumed: 1,
        debtIncurred: 0,
        debtBalance: 0,
      }),
      getCreditsBalance: vi.fn().mockResolvedValue({
        daily: 10,
        subscription: 0,
        purchased: 0,
        total: 10,
        debt: 0,
        available: 10,
      }),
    };
    activityLogServiceMock = {
      logAiChat: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        AiProxyService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CreditService, useValue: creditServiceMock },
        { provide: ActivityLogService, useValue: activityLogServiceMock },
      ],
    }).compile();

    service = module.get(AiProxyService);
    vi.restoreAllMocks();
  });

  it('merges model reasoning providerOptions with request user metadata', async () => {
    const provider = createMockAiProvider({
      providerType: 'azure',
      baseUrl: 'https://api.example.com/v1',
    });
    const model = createMockAiModel({
      providerId: provider.id,
      modelId: 'kimi-k2.5',
      upstreamId: 'kimi-k2.5',
      minTier: SubscriptionTier.free,
      capabilitiesJson: {
        reasoning: {
          levels: [
            { id: 'off', label: 'Off' },
            {
              id: 'high',
              label: 'High',
              visibleParams: [{ key: 'enableReasoning', value: 'false' }],
            },
          ],
        },
      },
    });

    prismaMock.aiModel.findFirst.mockResolvedValue({
      ...model,
      provider,
    } as never);

    vi.spyOn(ModelProviderFactory, 'create').mockReturnValue({
      model: { specificationVersion: 'v3' } as never,
      providerOptions: {
        openaiCompatible: {
          enableReasoning: false,
        },
        openai: {
          reasoningEffort: 'high',
        },
      },
    });

    vi.mocked(generateText).mockResolvedValue({
      text: 'ok',
      toolCalls: [],
      usage: {
        inputTokens: 10,
        outputTokens: 5,
      },
    } as never);

    await service.proxyChatCompletion('user-123', SubscriptionTier.free, {
      model: 'azure/kimi-k2.5',
      user: 'request-user',
      thinking: {
        mode: 'level',
        level: 'high',
      },
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: {
          openaiCompatible: {
            enableReasoning: false,
            user: 'request-user',
          },
          openai: {
            reasoningEffort: 'high',
            user: 'request-user',
          },
          openrouter: {
            user: 'request-user',
          },
        },
      }),
    );
  });

  it('merges model reasoning providerOptions with request user metadata for streaming calls', async () => {
    const provider = createMockAiProvider({
      providerType: 'azure',
      baseUrl: 'https://api.example.com/v1',
    });
    const model = createMockAiModel({
      providerId: provider.id,
      modelId: 'kimi-k2.5',
      upstreamId: 'kimi-k2.5',
      minTier: SubscriptionTier.free,
      capabilitiesJson: {
        reasoning: {
          levels: [
            { id: 'off', label: 'Off' },
            {
              id: 'high',
              label: 'High',
              visibleParams: [{ key: 'enableReasoning', value: 'false' }],
            },
          ],
        },
      },
    });

    prismaMock.aiModel.findFirst.mockResolvedValue({
      ...model,
      provider,
    } as never);

    vi.spyOn(ModelProviderFactory, 'create').mockReturnValue({
      model: { specificationVersion: 'v3' } as never,
      providerOptions: {
        openaiCompatible: {
          enableReasoning: false,
        },
        openai: {
          reasoningEffort: 'high',
        },
      },
    });

    vi.mocked(streamText).mockReturnValue({
      fullStream: (async function* () {})(),
      usage: Promise.resolve({
        inputTokens: 10,
        outputTokens: 5,
      }),
    } as never);

    const expectedStream = new ReadableStream<Uint8Array>();
    const createStreamSpy = vi
      .spyOn(SSEStreamBuilder.prototype, 'createStream')
      .mockReturnValue(expectedStream);

    const result = await service.proxyChatCompletionStream(
      'user-123',
      SubscriptionTier.free,
      {
        model: 'azure/kimi-k2.5',
        user: 'request-user',
        thinking: {
          mode: 'level',
          level: 'high',
        },
        messages: [{ role: 'user', content: 'Hello' }],
      },
    );

    expect(result).toBe(expectedStream);
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: {
          openaiCompatible: {
            enableReasoning: false,
            user: 'request-user',
          },
          openai: {
            reasoningEffort: 'high',
            user: 'request-user',
          },
          openrouter: {
            user: 'request-user',
          },
        },
      }),
    );
    expect(createStreamSpy).toHaveBeenCalledOnce();
  });
});

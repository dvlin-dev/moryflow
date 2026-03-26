/**
 * AiProxyService 单元测试
 *
 * 测试 AI 代理服务的完整业务逻辑
 * 注意：此测试仅测试公开的 API 方法，私有方法通过公开方法的行为间接测试
 */

// Note: Mock type casting produces 'any' returns in some scenarios

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { generateText, streamText } from 'ai';
import { AiProxyService } from './ai-proxy.service';
import { PrismaService } from '../prisma';
import { CreditService } from '../credit';
import { CreditLedgerService } from '../credit-ledger';
import { ActivityLogService } from '../activity-log';
import {
  createPrismaMock,
  MockPrismaService,
} from '../testing/mocks/prisma.mock';
import {
  createMockAiModel,
  createMockAiProvider,
  SubscriptionTier,
} from '../testing/factories';
import {
  InsufficientCreditsException,
  OutstandingDebtException,
  ModelNotFoundException,
  InsufficientModelPermissionException,
  InvalidRequestException,
} from './exceptions';
import { ModelProviderFactory } from './providers';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    output += decoder.decode(value, { stream: true });
  }

  output += decoder.decode();
  return output;
}

describe('AiProxyService', () => {
  let service: AiProxyService;
  let prismaMock: MockPrismaService;
  let creditServiceMock: {
    getCreditsBalance: ReturnType<typeof vi.fn>;
  };
  let creditLedgerServiceMock: {
    recordAiChatSettlement: ReturnType<typeof vi.fn>;
    recordAiSettlementFailure: ReturnType<typeof vi.fn>;
  };
  let activityLogServiceMock: { logAiChat: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    creditServiceMock = {
      getCreditsBalance: vi.fn().mockResolvedValue({
        daily: 15,
        subscription: 0,
        purchased: 0,
        total: 15,
        debt: 0,
        available: 15,
      }),
    };
    creditLedgerServiceMock = {
      recordAiChatSettlement: vi.fn().mockResolvedValue({
        id: 'ledger-1',
        status: 'APPLIED',
        anomalyCode: null,
        creditsDelta: -10,
        computedCredits: 10,
        appliedCredits: 10,
        debtDelta: 0,
      }),
      recordAiSettlementFailure: vi.fn().mockResolvedValue({
        id: 'ledger-failed-1',
        status: 'FAILED',
        anomalyCode: 'SETTLEMENT_FAILED',
        creditsDelta: 0,
        computedCredits: 0,
        appliedCredits: 0,
        debtDelta: 0,
      }),
    };
    activityLogServiceMock = {
      logAiChat: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiProxyService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CreditService, useValue: creditServiceMock },
        { provide: CreditLedgerService, useValue: creditLedgerServiceMock },
        { provide: ActivityLogService, useValue: activityLogServiceMock },
      ],
    }).compile();

    service = module.get<AiProxyService>(AiProxyService);
    vi.spyOn(ModelProviderFactory, 'create').mockReturnValue({
      model: { specificationVersion: 'v3' } as never,
      providerOptions: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== getAllModelsWithAccess ====================

  describe('getAllModelsWithAccess', () => {
    it('应返回带有访问权限信息的模型列表', async () => {
      const provider = createMockAiProvider({ providerType: 'openai' });
      const freeModel = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-4o-mini',
        displayName: 'GPT-4o Mini',
        minTier: SubscriptionTier.free,
        enabled: true,
      });
      const proModel = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-4o',
        displayName: 'GPT-4o',
        minTier: SubscriptionTier.pro,
        enabled: true,
      });

      prismaMock.aiModel.findMany.mockResolvedValue([
        { ...freeModel, provider } as Parameters<
          typeof prismaMock.aiModel.findMany.mockResolvedValue
        >[0][0],
        { ...proModel, provider } as Parameters<
          typeof prismaMock.aiModel.findMany.mockResolvedValue
        >[0][0],
      ]);

      const result = await service.getAllModelsWithAccess(
        SubscriptionTier.free,
      );

      expect(result).toHaveLength(2);

      const freeModelResult = result.find((m) => m.id === 'openai/gpt-4o-mini');
      const proModelResult = result.find((m) => m.id === 'openai/gpt-4o');

      expect(freeModelResult?.available).toBe(true);
      expect(proModelResult?.available).toBe(false);
    });

    it('模型列表查询应只触发一次数据库读取', async () => {
      const provider = createMockAiProvider({ providerType: 'openai' });
      const model = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-4o-mini',
        minTier: SubscriptionTier.free,
        enabled: true,
      });

      prismaMock.aiModel.findMany.mockResolvedValue([
        { ...model, provider } as Parameters<
          typeof prismaMock.aiModel.findMany.mockResolvedValue
        >[0][0],
      ]);

      await service.getAllModelsWithAccess(SubscriptionTier.free);

      expect(prismaMock.aiModel.findMany).toHaveBeenCalledTimes(1);
    });

    it('Pro 用户应能访问所有模型', async () => {
      const provider = createMockAiProvider({ providerType: 'openai' });
      const models = [
        createMockAiModel({
          providerId: provider.id,
          minTier: SubscriptionTier.free,
        }),
        createMockAiModel({
          providerId: provider.id,
          minTier: SubscriptionTier.basic,
        }),
        createMockAiModel({
          providerId: provider.id,
          minTier: SubscriptionTier.pro,
        }),
      ];

      prismaMock.aiModel.findMany.mockResolvedValue(
        models.map((m) => ({ ...m, provider })),
      );

      const result = await service.getAllModelsWithAccess(SubscriptionTier.pro);

      expect(result.every((m) => m.available)).toBe(true);
    });

    it('应只返回已启用的模型', async () => {
      const provider = createMockAiProvider();
      const enabledModel = createMockAiModel({
        providerId: provider.id,
        enabled: true,
      });
      // 创建禁用模型用于测试场景，但 findMany 不会返回它
      createMockAiModel({
        providerId: provider.id,
        enabled: false,
      });

      // findMany 只会返回 enabled=true 的模型
      prismaMock.aiModel.findMany.mockResolvedValue([
        { ...enabledModel, provider } as Parameters<
          typeof prismaMock.aiModel.findMany.mockResolvedValue
        >[0][0],
      ]);

      const result = await service.getAllModelsWithAccess(
        SubscriptionTier.free,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(`openai/${enabledModel.modelId}`);
    });

    it('无模型时应返回空数组', async () => {
      prismaMock.aiModel.findMany.mockResolvedValue([]);

      const result = await service.getAllModelsWithAccess(
        SubscriptionTier.free,
      );

      expect(result).toEqual([]);
    });
  });

  // ==================== proxyChatCompletion ====================

  describe('proxyChatCompletion', () => {
    it('successful settlements keep activity log anomalyCode as null', async () => {
      const provider = createMockAiProvider({ providerType: 'openai' });
      const model = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-success-no-anomaly',
        minTier: SubscriptionTier.free,
      });

      prismaMock.aiModel.findFirst.mockResolvedValue({
        ...model,
        provider,
      } as never);
      creditLedgerServiceMock.recordAiChatSettlement.mockResolvedValue({
        id: 'ledger-success-1',
        status: 'APPLIED',
        anomalyCode: null,
        creditsDelta: -1,
        computedCredits: 1,
        appliedCredits: 1,
        debtDelta: 0,
      });
      vi.mocked(generateText).mockResolvedValue({
        text: 'ok',
        toolCalls: [],
        usage: {
          inputTokens: 20,
          outputTokens: 10,
        },
      } as never);

      const result = await service.proxyChatCompletion(
        'user-123',
        SubscriptionTier.free,
        {
          model: 'openai/gpt-success-no-anomaly',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );

      expect(result.choices[0]?.message.content).toBe('ok');
      expect(activityLogServiceMock.logAiChat).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          ledgerStatus: 'APPLIED',
          anomalyCode: null,
        }),
        expect.any(Number),
      );
    });

    it('usage 存在但 credits 为 0 时应写入 skipped anomaly 日志', async () => {
      const provider = createMockAiProvider({ providerType: 'openai' });
      const model = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-zero-price',
        minTier: SubscriptionTier.free,
        inputTokenPrice: 0,
        outputTokenPrice: 0,
      });

      prismaMock.aiModel.findFirst.mockResolvedValue({
        ...model,
        provider,
      } as never);
      creditLedgerServiceMock.recordAiChatSettlement.mockResolvedValue({
        id: 'ledger-skipped-1',
        status: 'SKIPPED',
        anomalyCode: 'ZERO_PRICE_CONFIG',
        creditsDelta: 0,
        computedCredits: 0,
        appliedCredits: 0,
        debtDelta: 0,
      });
      vi.mocked(generateText).mockResolvedValue({
        text: 'ok',
        toolCalls: [],
        usage: {
          inputTokens: 40,
          outputTokens: 10,
        },
      } as never);

      const result = await service.proxyChatCompletion(
        'user-123',
        SubscriptionTier.free,
        {
          model: 'openai/gpt-zero-price',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );

      expect(result.choices[0]?.message.content).toBe('ok');
      expect(
        creditLedgerServiceMock.recordAiChatSettlement,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          computedCredits: 0,
          totalTokens: 50,
        }),
      );
      expect(activityLogServiceMock.logAiChat).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          ledgerEntryId: 'ledger-skipped-1',
          ledgerStatus: 'SKIPPED',
          anomalyCode: 'ZERO_PRICE_CONFIG',
        }),
        expect.any(Number),
      );
    });

    it('usage 缺失时应写入 USAGE_MISSING anomaly', async () => {
      const provider = createMockAiProvider({ providerType: 'openai' });
      const model = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-missing-usage',
        minTier: SubscriptionTier.free,
      });

      prismaMock.aiModel.findFirst.mockResolvedValue({
        ...model,
        provider,
      } as never);
      creditLedgerServiceMock.recordAiChatSettlement.mockResolvedValue({
        id: 'ledger-missing-usage-1',
        status: 'SKIPPED',
        anomalyCode: 'USAGE_MISSING',
        creditsDelta: 0,
        computedCredits: 0,
        appliedCredits: 0,
        debtDelta: 0,
      });
      vi.mocked(generateText).mockResolvedValue({
        text: 'ok',
        toolCalls: [],
        usage: {},
      } as never);

      const result = await service.proxyChatCompletion(
        'user-123',
        SubscriptionTier.free,
        {
          model: 'openai/gpt-missing-usage',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );

      expect(result.choices[0]?.message.content).toBe('ok');
      expect(
        creditLedgerServiceMock.recordAiChatSettlement,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          totalTokens: 0,
          computedCredits: 0,
          usageMissing: true,
        }),
      );
      expect(activityLogServiceMock.logAiChat).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          anomalyCode: 'USAGE_MISSING',
          ledgerStatus: 'SKIPPED',
        }),
        expect.any(Number),
      );
    });

    it('模型不存在时应抛出 ModelNotFoundException', async () => {
      prismaMock.aiModel.findFirst.mockResolvedValue(null);

      await expect(
        service.proxyChatCompletion('user-123', SubscriptionTier.free, {
          model: 'non-existent',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow(ModelNotFoundException);
    });

    it('canonical model id 应按 provider/model 校验模型', async () => {
      const provider = createMockAiProvider({ providerType: 'openai' });
      const model = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-4o-mini',
        minTier: SubscriptionTier.free,
        enabled: true,
      });

      prismaMock.aiModel.findFirst.mockResolvedValue({
        ...model,
        provider,
      } as Parameters<
        typeof prismaMock.aiModel.findFirst.mockResolvedValue
      >[0]);
      creditServiceMock.getCreditsBalance.mockResolvedValue({
        daily: 0,
        subscription: 0,
        purchased: 0,
        total: 0,
        debt: 0,
        available: 0,
      });

      await expect(
        service.proxyChatCompletion('user-123', SubscriptionTier.free, {
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow(InsufficientCreditsException);

      expect(prismaMock.aiModel.findFirst).toHaveBeenCalledTimes(1);
      expect(prismaMock.aiModel.findFirst.mock.calls.at(0)?.[0]).toMatchObject({
        where: {
          modelId: 'gpt-4o-mini',
          provider: {
            providerType: 'openai',
          },
        },
      });
    });

    it('用户等级不足时应抛出 InsufficientModelPermissionException', async () => {
      const provider = createMockAiProvider();
      const model = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-4o',
        minTier: SubscriptionTier.pro,
        enabled: true,
      });

      prismaMock.aiModel.findFirst.mockResolvedValue({
        ...model,
        provider,
      } as Parameters<
        typeof prismaMock.aiModel.findFirst.mockResolvedValue
      >[0]);

      await expect(
        service.proxyChatCompletion('user-123', SubscriptionTier.free, {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow(InsufficientModelPermissionException);
    });

    it('积分不足时应抛出 InsufficientCreditsException', async () => {
      const provider = createMockAiProvider();
      const model = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-4o-mini',
        minTier: SubscriptionTier.free,
        enabled: true,
      });

      prismaMock.aiModel.findFirst.mockResolvedValue({
        ...model,
        provider,
      } as Parameters<
        typeof prismaMock.aiModel.findFirst.mockResolvedValue
      >[0]);

      creditServiceMock.getCreditsBalance.mockResolvedValue({
        daily: 0,
        subscription: 0,
        purchased: 0,
        total: 0,
        debt: 0,
        available: 0,
      });

      await expect(
        service.proxyChatCompletion('user-123', SubscriptionTier.free, {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow(InsufficientCreditsException);
    });

    it('超出套餐 n 上限应抛出 InvalidRequestException', async () => {
      const provider = createMockAiProvider();
      const model = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-4o-mini',
        minTier: SubscriptionTier.free,
        enabled: true,
      });

      prismaMock.aiModel.findFirst.mockResolvedValue({
        ...model,
        provider,
      } as Parameters<
        typeof prismaMock.aiModel.findFirst.mockResolvedValue
      >[0]);

      await expect(
        service.proxyChatCompletion('user-123', SubscriptionTier.free, {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
          n: 2,
        }),
      ).rejects.toThrow(InvalidRequestException);
    });

    it('存在欠费时应抛出 OutstandingDebtException', async () => {
      const provider = createMockAiProvider();
      const model = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-4o-mini',
        minTier: SubscriptionTier.free,
        enabled: true,
      });

      prismaMock.aiModel.findFirst.mockResolvedValue({
        ...model,
        provider,
      } as Parameters<
        typeof prismaMock.aiModel.findFirst.mockResolvedValue
      >[0]);

      creditServiceMock.getCreditsBalance.mockResolvedValue({
        daily: 10,
        subscription: 0,
        purchased: 0,
        total: 10,
        debt: 5,
        available: 0,
      });

      await expect(
        service.proxyChatCompletion('user-123', SubscriptionTier.free, {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow(OutstandingDebtException);
    });

    it('模型被禁用时应抛出 ModelNotFoundException', async () => {
      prismaMock.aiModel.findFirst.mockResolvedValue(null); // enabled=true 条件过滤

      await expect(
        service.proxyChatCompletion('user-123', SubscriptionTier.pro, {
          model: 'disabled-model',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow(ModelNotFoundException);
    });

    it('缺少 messages 参数时应抛出 BadRequestException', async () => {
      await expect(
        service.proxyChatCompletion('user-123', SubscriptionTier.free, {
          model: 'gpt-4o-mini',
          messages: [],
        }),
      ).rejects.toThrow();
    });
  });

  // ==================== 积分计算验证 ====================

  describe('积分计算', () => {
    it('应验证积分余额查询被调用', async () => {
      const provider = createMockAiProvider();
      const model = createMockAiModel({
        providerId: provider.id,
        minTier: SubscriptionTier.free,
        enabled: true,
      });

      prismaMock.aiModel.findFirst.mockResolvedValue({
        ...model,
        provider,
      } as Parameters<
        typeof prismaMock.aiModel.findFirst.mockResolvedValue
      >[0]);

      creditServiceMock.getCreditsBalance.mockResolvedValue({
        daily: 0,
        subscription: 0,
        purchased: 0,
        total: 0,
        debt: 0,
        available: 0,
      });

      await expect(
        service.proxyChatCompletion('user-123', SubscriptionTier.free, {
          model: model.modelId,
          messages: [{ role: 'user', content: 'Test' }],
        }),
      ).rejects.toThrow(InsufficientCreditsException);

      expect(creditServiceMock.getCreditsBalance).toHaveBeenCalledWith(
        'user-123',
      );
    });
  });

  describe('proxyChatCompletionStream', () => {
    it('结算失败后仍应输出 final chunk 和 done', async () => {
      const provider = createMockAiProvider({ providerType: 'openai' });
      const model = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-4o-mini',
        minTier: SubscriptionTier.free,
      });

      prismaMock.aiModel.findFirst.mockResolvedValue({
        ...model,
        provider,
      } as never);
      creditLedgerServiceMock.recordAiChatSettlement.mockRejectedValue(
        new Error('amount must be positive'),
      );
      vi.mocked(streamText).mockReturnValue({
        fullStream: (async function* () {
          yield { type: 'text-delta', text: 'Hello' };
        })(),
        usage: Promise.resolve({
          inputTokens: 20,
          outputTokens: 10,
        }),
      } as never);

      const stream = await service.proxyChatCompletionStream(
        'user-123',
        SubscriptionTier.free,
        {
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );
      const output = await readStream(stream);

      expect(output).toContain('"content":"Hello"');
      expect(output).toContain('"finish_reason":"stop"');
      expect(output).toContain('data: [DONE]');
      expect(output).not.toContain('"code":"stream_processing_failed"');
      expect(
        creditLedgerServiceMock.recordAiSettlementFailure,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'AI_CHAT',
          idempotencyKey: expect.stringMatching(/:failed$/),
          computedCredits: expect.any(Number),
          errorMessage: 'amount must be positive',
        }),
      );
    });

    it('stream usage 缺失时应透传 usageMissing 给账本结算', async () => {
      const provider = createMockAiProvider({ providerType: 'openai' });
      const model = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-missing-stream-usage',
        minTier: SubscriptionTier.free,
      });

      prismaMock.aiModel.findFirst.mockResolvedValue({
        ...model,
        provider,
      } as never);
      creditLedgerServiceMock.recordAiChatSettlement.mockResolvedValue({
        id: 'ledger-stream-missing-usage-1',
        status: 'SKIPPED',
        anomalyCode: 'USAGE_MISSING',
        creditsDelta: 0,
        computedCredits: 0,
        appliedCredits: 0,
        debtDelta: 0,
      });
      vi.mocked(streamText).mockReturnValue({
        fullStream: (async function* () {
          yield { type: 'text-delta', text: 'Hello' };
        })(),
        usage: Promise.resolve({}),
      } as never);

      const stream = await service.proxyChatCompletionStream(
        'user-123',
        SubscriptionTier.free,
        {
          model: 'openai/gpt-missing-stream-usage',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );
      await readStream(stream);

      expect(
        creditLedgerServiceMock.recordAiChatSettlement,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          totalTokens: 0,
          computedCredits: 0,
          usageMissing: true,
        }),
      );
    });
  });
});

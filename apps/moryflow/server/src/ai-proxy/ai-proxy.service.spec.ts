/**
 * AiProxyService 单元测试
 *
 * 测试 AI 代理服务的完整业务逻辑
 * 注意：此测试仅测试公开的 API 方法，私有方法通过公开方法的行为间接测试
 */

// Note: Mock type casting produces 'any' returns in some scenarios

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AiProxyService } from './ai-proxy.service';
import { PrismaService } from '../prisma';
import { CreditService } from '../credit';
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

describe('AiProxyService', () => {
  let service: AiProxyService;
  let prismaMock: MockPrismaService;
  let creditServiceMock: {
    consumeCreditsWithDebt: ReturnType<typeof vi.fn>;
    getCreditsBalance: ReturnType<typeof vi.fn>;
  };
  let activityLogServiceMock: { logAiChat: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    creditServiceMock = {
      consumeCreditsWithDebt: vi.fn().mockResolvedValue({
        consumed: 10,
        debtIncurred: 0,
        debtBalance: 0,
      }),
      getCreditsBalance: vi.fn().mockResolvedValue({
        daily: 15,
        subscription: 0,
        purchased: 0,
        total: 15,
        debt: 0,
        available: 15,
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
        { provide: ActivityLogService, useValue: activityLogServiceMock },
      ],
    }).compile();

    service = module.get<AiProxyService>(AiProxyService);
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

      expect(prismaMock.aiModel.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            modelId: 'gpt-4o-mini',
            provider: expect.objectContaining({
              providerType: 'openai',
            }),
          }),
        }),
      );
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
});

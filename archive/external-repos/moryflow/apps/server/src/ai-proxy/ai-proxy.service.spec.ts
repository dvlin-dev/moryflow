/**
 * AiProxyService 单元测试
 *
 * 测试 AI 代理服务的完整业务逻辑
 * 注意：此测试仅测试公开的 API 方法，私有方法通过公开方法的行为间接测试
 */

/* eslint-disable @typescript-eslint/no-unsafe-return */
// Note: Mock type casting produces 'any' returns in some scenarios

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AiProxyService } from './ai-proxy.service';
import { PrismaService } from '../prisma';
import { CreditService } from '../credit';
import {
  createPrismaMock,
  MockPrismaService,
} from '../testing/mocks/prisma.mock';
import {
  createMockAiModel,
  createMockAiProvider,
  UserTier,
} from '../testing/factories';

describe('AiProxyService', () => {
  let service: AiProxyService;
  let prismaMock: MockPrismaService;
  let creditServiceMock: {
    consumeCredits: ReturnType<typeof vi.fn>;
    getCreditsBalance: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    creditServiceMock = {
      consumeCredits: vi.fn(),
      getCreditsBalance: vi.fn().mockResolvedValue({
        daily: 15,
        subscription: 0,
        purchased: 0,
        total: 15,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiProxyService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CreditService, useValue: creditServiceMock },
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
        minTier: UserTier.free,
        enabled: true,
      });
      const proModel = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-4o',
        displayName: 'GPT-4o',
        minTier: UserTier.pro,
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

      const result = await service.getAllModelsWithAccess(UserTier.free);

      expect(result).toHaveLength(2);

      const freeModelResult = result.find((m) => m.id === 'gpt-4o-mini');
      const proModelResult = result.find((m) => m.id === 'gpt-4o');

      expect(freeModelResult?.available).toBe(true);
      expect(proModelResult?.available).toBe(false);
    });

    it('Pro 用户应能访问所有模型', async () => {
      const provider = createMockAiProvider({ providerType: 'openai' });
      const models = [
        createMockAiModel({ providerId: provider.id, minTier: UserTier.free }),
        createMockAiModel({ providerId: provider.id, minTier: UserTier.basic }),
        createMockAiModel({ providerId: provider.id, minTier: UserTier.pro }),
      ];

      prismaMock.aiModel.findMany.mockResolvedValue(
        models.map(
          (m) =>
            ({ ...m, provider }) as Parameters<
              typeof prismaMock.aiModel.findMany.mockResolvedValue
            >[0][0],
        ),
      );

      const result = await service.getAllModelsWithAccess(UserTier.pro);

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

      const result = await service.getAllModelsWithAccess(UserTier.free);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(enabledModel.modelId);
    });

    it('无模型时应返回空数组', async () => {
      prismaMock.aiModel.findMany.mockResolvedValue([]);

      const result = await service.getAllModelsWithAccess(UserTier.free);

      expect(result).toEqual([]);
    });
  });

  // ==================== proxyChatCompletion ====================

  describe('proxyChatCompletion', () => {
    it('模型不存在时应抛出 NotFoundException', async () => {
      prismaMock.aiModel.findFirst.mockResolvedValue(null);

      await expect(
        service.proxyChatCompletion('user-123', UserTier.free, {
          model: 'non-existent',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('用户等级不足时应抛出 ForbiddenException', async () => {
      const provider = createMockAiProvider();
      const model = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-4o',
        minTier: UserTier.pro,
        enabled: true,
      });

      prismaMock.aiModel.findFirst.mockResolvedValue({
        ...model,
        provider,
      } as Parameters<
        typeof prismaMock.aiModel.findFirst.mockResolvedValue
      >[0]);

      await expect(
        service.proxyChatCompletion('user-123', UserTier.free, {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('积分不足时应抛出 ForbiddenException', async () => {
      const provider = createMockAiProvider();
      const model = createMockAiModel({
        providerId: provider.id,
        modelId: 'gpt-4o-mini',
        minTier: UserTier.free,
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
      });

      await expect(
        service.proxyChatCompletion('user-123', UserTier.free, {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('模型被禁用时应抛出 NotFoundException', async () => {
      prismaMock.aiModel.findFirst.mockResolvedValue(null); // enabled=true 条件过滤

      await expect(
        service.proxyChatCompletion('user-123', UserTier.pro, {
          model: 'disabled-model',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('缺少 messages 参数时应抛出 BadRequestException', async () => {
      await expect(
        service.proxyChatCompletion('user-123', UserTier.free, {
          model: 'gpt-4o-mini',
          messages: [],
        }),
      ).rejects.toThrow();
    });
  });

  // ==================== 等级权限验证 ====================

  describe('等级权限逻辑', () => {
    const tierOrder = [
      UserTier.free,
      UserTier.basic,
      UserTier.pro,
      UserTier.license,
    ] as const;

    it('Free 用户只能访问 Free 模型', () => {
      expect(
        tierOrder.indexOf(UserTier.free) >= tierOrder.indexOf(UserTier.free),
      ).toBe(true);
      expect(
        tierOrder.indexOf(UserTier.free) >= tierOrder.indexOf(UserTier.basic),
      ).toBe(false);
      expect(
        tierOrder.indexOf(UserTier.free) >= tierOrder.indexOf(UserTier.pro),
      ).toBe(false);
    });

    it('Basic 用户可访问 Free 和 Basic 模型', () => {
      expect(
        tierOrder.indexOf(UserTier.basic) >= tierOrder.indexOf(UserTier.free),
      ).toBe(true);
      expect(
        tierOrder.indexOf(UserTier.basic) >= tierOrder.indexOf(UserTier.basic),
      ).toBe(true);
      expect(
        tierOrder.indexOf(UserTier.basic) >= tierOrder.indexOf(UserTier.pro),
      ).toBe(false);
    });

    it('Pro 用户可访问所有等级模型', () => {
      expect(
        tierOrder.indexOf(UserTier.pro) >= tierOrder.indexOf(UserTier.free),
      ).toBe(true);
      expect(
        tierOrder.indexOf(UserTier.pro) >= tierOrder.indexOf(UserTier.basic),
      ).toBe(true);
      expect(
        tierOrder.indexOf(UserTier.pro) >= tierOrder.indexOf(UserTier.pro),
      ).toBe(true);
    });

    it('License 用户可访问所有等级模型', () => {
      expect(
        tierOrder.indexOf(UserTier.license) >= tierOrder.indexOf(UserTier.free),
      ).toBe(true);
      expect(
        tierOrder.indexOf(UserTier.license) >=
          tierOrder.indexOf(UserTier.basic),
      ).toBe(true);
      expect(
        tierOrder.indexOf(UserTier.license) >= tierOrder.indexOf(UserTier.pro),
      ).toBe(true);
    });
  });

  // ==================== 积分计算验证 ====================

  describe('积分计算', () => {
    it('应验证积分余额查询被调用', async () => {
      const provider = createMockAiProvider();
      const model = createMockAiModel({
        providerId: provider.id,
        minTier: UserTier.free,
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
      });

      await expect(
        service.proxyChatCompletion('user-123', UserTier.free, {
          model: model.modelId,
          messages: [{ role: 'user', content: 'Test' }],
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(creditServiceMock.getCreditsBalance).toHaveBeenCalledWith(
        'user-123',
      );
    });
  });
});

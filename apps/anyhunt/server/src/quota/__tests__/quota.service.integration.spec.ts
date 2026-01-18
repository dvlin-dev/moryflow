/**
 * QuotaService 集成测试
 * 使用 Testcontainers 进行真实数据库测试
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TestContainers } from '../../../test/helpers';
import { QuotaService } from '../quota.service';
import { QuotaRepository } from '../quota.repository';
import { QuotaModule } from '../quota.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisModule } from '../../redis/redis.module';
import { RedisService } from '../../redis/redis.service';
import { QuotaExceededError, DuplicateRefundError } from '../quota.errors';

describe('QuotaService (Integration)', () => {
  let module: TestingModule;
  let service: QuotaService;
  let repository: QuotaRepository;
  let prisma: PrismaService;
  let redis: RedisService;

  const testUserId = 'test_user_quota_integration';

  beforeAll(async () => {
    // 启动容器
    await TestContainers.start();

    // 创建测试模块
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        PrismaModule,
        RedisModule,
        QuotaModule,
      ],
    }).compile();

    service = module.get(QuotaService);
    repository = module.get(QuotaRepository);
    prisma = module.get(PrismaService);
    redis = module.get(RedisService);
  }, 60000); // 60s timeout for container startup

  afterAll(async () => {
    await module?.close();
    await TestContainers.stop();
  });

  beforeEach(async () => {
    // 清理测试数据
    await prisma.quotaTransaction.deleteMany({ where: { userId: testUserId } });
    await prisma.quota.deleteMany({ where: { userId: testUserId } });
    await prisma.subscription.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    await prisma.user.create({
      data: {
        id: testUserId,
        email: `${testUserId}@anyhunt.app`,
      },
    });

    // 清理 Redis
    await redis.del(`cc:${testUserId}`);
    await redis.del(`rl:${testUserId}:*`);
  });

  // ============ 基本流程测试 ============

  describe('quota lifecycle', () => {
    it('should initialize quota for new user', async () => {
      await service.ensureExists(testUserId, 'FREE');

      const status = await service.getStatus(testUserId);

      expect(status.daily.limit).toBe(100); // FREE tier daily credits
      expect(status.daily.remaining).toBe(100);
      expect(status.monthly.limit).toBe(0); // FREE monthly quota
      expect(status.monthly.used).toBe(0);
      expect(status.purchased).toBe(0);
      expect(status.totalRemaining).toBe(100);
    });

    it('should deduct from daily credits for FREE user', async () => {
      await service.ensureExists(testUserId, 'FREE');

      const result = await service.deductOrThrow(
        testUserId,
        1,
        'test_screenshot_1',
      );

      expect(result.breakdown[0]?.source).toBe('DAILY');
      expect(result.breakdown[0]?.transactionId).toBeDefined();

      const status = await service.getStatus(testUserId);
      expect(status.daily.used).toBe(1);
      expect(status.totalRemaining).toBe(99);
    });

    it('should refund quota correctly', async () => {
      await service.ensureExists(testUserId, 'FREE');
      const deduct = await service.deductOrThrow(
        testUserId,
        1,
        'test_screenshot_2',
      );

      const refundResult = await service.refund({
        userId: testUserId,
        referenceId: 'test_screenshot_2_refund',
        deductTransactionId: deduct.breakdown[0]?.transactionId,
        source: 'DAILY',
        amount: 1,
      });

      expect(refundResult.success).toBe(true);

      const status = await service.getStatus(testUserId);
      expect(status.daily.used).toBe(0);
      expect(status.totalRemaining).toBe(100);
    });
  });

  // ============ 扣减逻辑测试 ============

  describe('deduction logic', () => {
    it('should exhaust monthly quota then use purchased', async () => {
      await prisma.subscription.create({
        data: { userId: testUserId, tier: 'BASIC' },
      });
      // 创建只有 2 个月度配额的用户
      await prisma.quota.create({
        data: {
          userId: testUserId,
          monthlyLimit: 2,
          monthlyUsed: 0,
          purchasedQuota: 5,
          periodStartAt: new Date(),
          periodEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // 扣减第一个（月度）
      const result1 = await service.deductOrThrow(testUserId, 1, 'ss_1');
      expect(result1.breakdown[0]?.source).toBe('MONTHLY');

      // 扣减第二个（月度）
      const result2 = await service.deductOrThrow(testUserId, 1, 'ss_2');
      expect(result2.breakdown[0]?.source).toBe('MONTHLY');

      // 扣减第三个（购买配额）
      const result3 = await service.deductOrThrow(testUserId, 1, 'ss_3');
      expect(result3.breakdown[0]?.source).toBe('PURCHASED');

      const status = await service.getStatus(testUserId);
      expect(status.monthly.used).toBe(2);
      expect(status.purchased).toBe(4);
    });

    it('should throw QuotaExceededError when exhausted', async () => {
      await prisma.subscription.create({
        data: { userId: testUserId, tier: 'BASIC' },
      });
      await prisma.quota.create({
        data: {
          userId: testUserId,
          monthlyLimit: 1,
          monthlyUsed: 1,
          purchasedQuota: 0,
          periodStartAt: new Date(),
          periodEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await expect(
        service.deductOrThrow(testUserId, 1, 'ss_fail'),
      ).rejects.toThrow(QuotaExceededError);
    });
  });

  // ============ 幂等性测试 ============

  describe('idempotency', () => {
    it('should prevent duplicate refund', async () => {
      await prisma.subscription.create({
        data: { userId: testUserId, tier: 'BASIC' },
      });
      await service.ensureExists(testUserId, 'BASIC');
      await service.deductOrThrow(testUserId, 1, 'ss_dup');

      // 第一次返还成功
      await service.refund({
        userId: testUserId,
        referenceId: 'ss_dup',
        source: 'MONTHLY',
        amount: 1,
      });

      // 第二次返还失败
      await expect(
        service.refund({
          userId: testUserId,
          referenceId: 'ss_dup',
          source: 'MONTHLY',
          amount: 1,
        }),
      ).rejects.toThrow(DuplicateRefundError);

      // 验证配额只返还了一次
      const status = await service.getStatus(testUserId);
      expect(status.monthly.used).toBe(0);
    });
  });

  // ============ 并发控制测试 ============

  describe('concurrency control', () => {
    it('should track concurrent requests', async () => {
      const count1 = await service.incrementConcurrent(testUserId, 'FREE');
      expect(count1).toBe(1);

      const count2 = await service.incrementConcurrent(testUserId, 'FREE');
      expect(count2).toBe(2);

      await service.decrementConcurrent(testUserId);
      await service.decrementConcurrent(testUserId);

      // 验证回到 0
      const current = await redis.getConcurrent(testUserId);
      expect(current).toBe(0);
    });

    it('should enforce concurrent limit', async () => {
      // FREE tier 限制是 2
      await service.incrementConcurrent(testUserId, 'FREE');
      await service.incrementConcurrent(testUserId, 'FREE');

      // 第三个请求应该失败
      await expect(
        service.incrementConcurrent(testUserId, 'FREE'),
      ).rejects.toThrow('Too many concurrent');
    });
  });

  // ============ 周期重置测试 ============

  describe('period reset', () => {
    it('should reset quota when period expires', async () => {
      await prisma.subscription.create({
        data: { userId: testUserId, tier: 'BASIC' },
      });
      // 创建一个已过期的配额
      await prisma.quota.create({
        data: {
          userId: testUserId,
          monthlyLimit: 100,
          monthlyUsed: 50,
          purchasedQuota: 0,
          periodStartAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 天前
          periodEndAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 天前
        },
      });

      // getStatus 应该触发周期重置
      const status = await service.getStatus(testUserId);

      expect(status.monthly.used).toBe(0);
      expect(status.monthly.remaining).toBe(100);
    });
  });

  // ============ 事务一致性测试 ============

  describe('transaction consistency', () => {
    it('should maintain consistency during concurrent deductions', async () => {
      await prisma.subscription.create({
        data: { userId: testUserId, tier: 'BASIC' },
      });
      await prisma.quota.create({
        data: {
          userId: testUserId,
          monthlyLimit: 100,
          monthlyUsed: 0,
          purchasedQuota: 0,
          periodStartAt: new Date(),
          periodEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // 并发执行 10 次扣减
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.deductOrThrow(testUserId, 1, `concurrent_ss_${i}`),
      );

      await Promise.all(promises);

      // 验证最终状态
      const status = await service.getStatus(testUserId);
      expect(status.monthly.used).toBe(10);
      expect(status.totalRemaining).toBe(90);

      // 验证交易记录数量
      const transactions = await prisma.quotaTransaction.findMany({
        where: { userId: testUserId, type: 'DEDUCT' },
      });
      expect(transactions).toHaveLength(10);
    });
  });
});

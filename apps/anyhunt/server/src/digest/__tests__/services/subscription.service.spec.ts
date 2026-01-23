/**
 * Digest Subscription Service Tests
 *
 * [PROVIDES]: DigestSubscriptionService 单元测试
 * [POS]: 测试订阅管理核心逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DigestSubscriptionService } from '../../services/subscription.service';
import {
  createMockPrisma,
  createSubscription,
  type MockPrismaDigest,
} from '../mocks';

describe('DigestSubscriptionService', () => {
  let service: DigestSubscriptionService;
  let mockPrisma: MockPrismaDigest;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new DigestSubscriptionService(mockPrisma as any);
  });

  // ========== create ==========

  describe('create', () => {
    it('should create subscription when under limit', async () => {
      // Mock user with FREE tier and 0 subscriptions
      mockPrisma.user.findUnique.mockResolvedValue({
        subscription: { tier: 'FREE', status: 'ACTIVE' },
        _count: { digestSubscriptions: 0 },
      });

      const subscription = createSubscription();
      mockPrisma.digestSubscription.create.mockResolvedValue(subscription);

      const result = await service.create('user-1', {
        name: 'Test',
        topic: 'AI',
        interests: ['machine learning'],
        searchLimit: 60,
        scrapeLimit: 20,
        minItems: 5,
        minScore: 70,
        contentWindowHours: 168,
        redeliveryPolicy: 'COOLDOWN',
        redeliveryCooldownDays: 7,
        languageMode: 'FOLLOW_UI',
        cron: '0 9 * * *',
        timezone: 'Asia/Shanghai',
        inboxEnabled: true,
        emailEnabled: false,
        webhookEnabled: false,
        generateItemSummaries: true,
        composeNarrative: true,
        tone: 'neutral',
        enabled: true,
      });

      expect(mockPrisma.digestSubscription.create).toHaveBeenCalled();
      expect(result).toEqual(subscription);
    });

    it('should throw ForbiddenException when FREE tier limit reached', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        subscription: { tier: 'FREE', status: 'ACTIVE' },
        _count: { digestSubscriptions: 3 }, // FREE limit is 3
      });

      await expect(
        service.create('user-1', {
          name: 'Test',
          topic: 'AI',
          interests: ['machine learning'],
          searchLimit: 60,
          scrapeLimit: 20,
          minItems: 5,
          minScore: 70,
          contentWindowHours: 168,
          redeliveryPolicy: 'COOLDOWN',
          redeliveryCooldownDays: 7,
          languageMode: 'FOLLOW_UI',
          cron: '0 9 * * *',
          timezone: 'UTC',
          inboxEnabled: true,
          emailEnabled: false,
          webhookEnabled: false,
          generateItemSummaries: true,
          composeNarrative: true,
          tone: 'neutral',
          enabled: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should use FREE tier when user has no subscription', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        subscription: null,
        _count: { digestSubscriptions: 2 },
      });
      mockPrisma.digestSubscription.create.mockResolvedValue(
        createSubscription(),
      );

      await service.create('user-1', {
        name: 'Test',
        topic: 'AI',
        interests: ['machine learning'],
        searchLimit: 60,
        scrapeLimit: 20,
        minItems: 5,
        minScore: 70,
        contentWindowHours: 168,
        redeliveryPolicy: 'COOLDOWN',
        redeliveryCooldownDays: 7,
        languageMode: 'FOLLOW_UI',
        cron: '0 9 * * *',
        timezone: 'UTC',
        inboxEnabled: true,
        emailEnabled: false,
        webhookEnabled: false,
        generateItemSummaries: true,
        composeNarrative: true,
        tone: 'neutral',
        enabled: true,
      });

      expect(mockPrisma.digestSubscription.create).toHaveBeenCalled();
    });

    it('should allow PRO tier to have more subscriptions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        subscription: { tier: 'PRO', status: 'ACTIVE' },
        _count: { digestSubscriptions: 50 }, // PRO limit is 100
      });
      mockPrisma.digestSubscription.create.mockResolvedValue(
        createSubscription(),
      );

      const result = await service.create('user-1', {
        name: 'Test',
        topic: 'AI',
        interests: ['machine learning'],
        searchLimit: 60,
        scrapeLimit: 20,
        minItems: 5,
        minScore: 70,
        contentWindowHours: 168,
        redeliveryPolicy: 'COOLDOWN',
        redeliveryCooldownDays: 7,
        languageMode: 'FOLLOW_UI',
        cron: '0 9 * * *',
        timezone: 'UTC',
        inboxEnabled: true,
        emailEnabled: false,
        webhookEnabled: false,
        generateItemSummaries: true,
        composeNarrative: true,
        tone: 'neutral',
        enabled: true,
      });

      expect(result).toBeDefined();
    });
  });

  // ========== update ==========

  describe('update', () => {
    it('should update subscription when user owns it', async () => {
      const existing = createSubscription();
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(existing);

      const updated = { ...existing, name: 'Updated Name' };
      mockPrisma.digestSubscription.update.mockResolvedValue(updated);

      const result = await service.update('user-1', 'sub-1', {
        name: 'Updated Name',
      });

      expect(mockPrisma.digestSubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: expect.objectContaining({ name: 'Updated Name' }),
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when subscription not found', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'sub-not-exist', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not update when user does not own subscription', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(null);

      await expect(
        service.update('user-2', 'sub-1', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========== delete ==========

  describe('delete', () => {
    it('should soft delete subscription', async () => {
      const existing = createSubscription();
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(existing);
      mockPrisma.digestSubscription.update.mockResolvedValue({
        ...existing,
        deletedAt: new Date(),
      });

      await service.delete('user-1', 'sub-1');

      expect(mockPrisma.digestSubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when subscription not found', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(null);

      await expect(service.delete('user-1', 'sub-not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ========== findOne ==========

  describe('findOne', () => {
    it('should find subscription excluding deleted', async () => {
      const subscription = createSubscription();
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(subscription);

      const result = await service.findOne('user-1', 'sub-1');

      expect(mockPrisma.digestSubscription.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'sub-1',
          userId: 'user-1',
          deletedAt: null,
        },
      });
      expect(result).toEqual(subscription);
    });

    it('should return null for deleted subscription', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(null);

      const result = await service.findOne('user-1', 'sub-deleted');

      expect(result).toBeNull();
    });
  });

  // ========== findMany ==========

  describe('findMany', () => {
    it('should return paginated subscriptions', async () => {
      const subscriptions = [
        createSubscription(),
        createSubscription({ id: 'sub-2' }),
      ];
      mockPrisma.digestSubscription.findMany.mockResolvedValue(subscriptions);
      mockPrisma.digestSubscription.count.mockResolvedValue(10);

      const result = await service.findMany('user-1', { page: 1, limit: 10 });

      expect(result).toEqual({
        items: subscriptions,
        total: 10,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter by enabled status', async () => {
      mockPrisma.digestSubscription.findMany.mockResolvedValue([]);
      mockPrisma.digestSubscription.count.mockResolvedValue(0);

      await service.findMany('user-1', { page: 1, limit: 10, enabled: true });

      expect(mockPrisma.digestSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ enabled: true }),
        }),
      );
    });

    it('should filter by followedTopicId', async () => {
      mockPrisma.digestSubscription.findMany.mockResolvedValue([]);
      mockPrisma.digestSubscription.count.mockResolvedValue(0);

      await service.findMany('user-1', {
        page: 1,
        limit: 10,
        followedTopicId: 'topic-1',
      });

      expect(mockPrisma.digestSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ followedTopicId: 'topic-1' }),
        }),
      );
    });

    it('should exclude deleted subscriptions', async () => {
      mockPrisma.digestSubscription.findMany.mockResolvedValue([]);
      mockPrisma.digestSubscription.count.mockResolvedValue(0);

      await service.findMany('user-1', { page: 1, limit: 10 });

      expect(mockPrisma.digestSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });
  });

  // ========== toggleEnabled ==========

  describe('toggleEnabled', () => {
    it('should enable subscription', async () => {
      const existing = createSubscription({ enabled: false });
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(existing);
      mockPrisma.digestSubscription.update.mockResolvedValue({
        ...existing,
        enabled: true,
      });

      const result = await service.toggleEnabled('user-1', 'sub-1', true);

      expect(mockPrisma.digestSubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { enabled: true },
      });
      expect(result.enabled).toBe(true);
    });

    it('should disable subscription', async () => {
      const existing = createSubscription({ enabled: true });
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(existing);
      mockPrisma.digestSubscription.update.mockResolvedValue({
        ...existing,
        enabled: false,
      });

      const result = await service.toggleEnabled('user-1', 'sub-1', false);

      expect(result.enabled).toBe(false);
    });

    it('should throw NotFoundException when subscription not found', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(null);

      await expect(
        service.toggleEnabled('user-1', 'sub-not-exist', true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========== findSubscriptionsToSchedule ==========

  describe('findSubscriptionsToSchedule', () => {
    it('should find enabled subscriptions with nextRunAt <= now', async () => {
      const subscriptions = [createSubscription()];
      mockPrisma.digestSubscription.findMany.mockResolvedValue(subscriptions);

      const result = await service.findSubscriptionsToSchedule();

      expect(mockPrisma.digestSubscription.findMany).toHaveBeenCalledWith({
        where: {
          enabled: true,
          deletedAt: null,
          nextRunAt: { lte: expect.any(Date) },
        },
        take: 100,
      });
      expect(result).toEqual(subscriptions);
    });
  });

  // ========== updateNextRunAt ==========

  describe('updateNextRunAt', () => {
    it('should update nextRunAt', async () => {
      const nextRunAt = new Date('2024-01-20T09:00:00Z');
      mockPrisma.digestSubscription.update.mockResolvedValue(
        createSubscription({ nextRunAt }),
      );

      await service.updateNextRunAt('sub-1', nextRunAt);

      expect(mockPrisma.digestSubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { nextRunAt },
      });
    });
  });

  // ========== toResponse ==========

  describe('toResponse', () => {
    it('should format subscription for API response', () => {
      const subscription = createSubscription();

      const response = service.toResponse(subscription);

      expect(response).toEqual({
        id: subscription.id,
        name: subscription.name,
        topic: subscription.topic,
        interests: subscription.interests,
        searchLimit: subscription.searchLimit,
        scrapeLimit: subscription.scrapeLimit,
        minItems: subscription.minItems,
        minScore: subscription.minScore,
        redeliveryPolicy: subscription.redeliveryPolicy,
        redeliveryCooldownDays: subscription.redeliveryCooldownDays,
        languageMode: subscription.languageMode,
        outputLocale: subscription.outputLocale,
        cron: subscription.cron,
        timezone: subscription.timezone,
        enabled: subscription.enabled,
        lastRunAt: subscription.lastRunAt,
        nextRunAt: subscription.nextRunAt,
        followedTopicId: subscription.followedTopicId,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      });
    });
  });
});

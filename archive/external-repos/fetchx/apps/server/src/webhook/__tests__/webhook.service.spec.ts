/**
 * WebhookService 单元测试
 * 测试 Webhook 管理业务逻辑
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WebhookService } from '../webhook.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { WebhookEvent } from '../webhook.constants';

describe('WebhookService', () => {
  let service: WebhookService;
  let mockPrisma: {
    webhook: {
      count: Mock;
      create: Mock;
      findMany: Mock;
      findFirst: Mock;
      update: Mock;
      delete: Mock;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      webhook: {
        count: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    service = new WebhookService(mockPrisma as unknown as PrismaService);
  });

  // ============ 创建 Webhook ============

  describe('create', () => {
    const createDto = {
      name: 'Test Webhook',
      url: 'https://example.com/webhook',
      events: ['screenshot.completed', 'screenshot.failed'] as WebhookEvent[],
    };

    it('should create webhook with generated secret', async () => {
      mockPrisma.webhook.count.mockResolvedValue(0);
      mockPrisma.webhook.create.mockResolvedValue({
        id: 'webhook_1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        secret: 'whsec_abcdef1234567890abcdef1234567890abcdef123456',
        events: ['screenshot.completed'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create('user_1', createDto);

      expect(result.id).toBe('webhook_1');
      expect(result.secretPreview).toMatch(/^whsec_[a-f0-9]{6}\.\.\.$/);
      expect(mockPrisma.webhook.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_1',
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          secret: expect.stringMatching(/^whsec_[a-f0-9]{48}$/),
        }),
      });
    });

    it('should throw when exceeding webhook limit', async () => {
      mockPrisma.webhook.count.mockResolvedValue(10);

      await expect(service.create('user_1', createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create('user_1', createDto)).rejects.toThrow(
        'Maximum 10 webhooks allowed',
      );
    });

    it('should allow creation when under limit', async () => {
      mockPrisma.webhook.count.mockResolvedValue(9);
      mockPrisma.webhook.create.mockResolvedValue({
        id: 'webhook_10',
        name: 'Test',
        url: 'https://test.com',
        secret: 'whsec_abc123abc123abc123abc123abc123abc123abc123abc123',
        events: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create('user_1', createDto);

      expect(result.id).toBe('webhook_10');
    });
  });

  // ============ 获取所有 Webhooks ============

  describe('findAllByUser', () => {
    it('should return all webhooks for user', async () => {
      mockPrisma.webhook.findMany.mockResolvedValue([
        {
          id: 'webhook_1',
          name: 'Webhook 1',
          url: 'https://a.com',
          secret: 'whsec_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          events: ['screenshot.completed'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'webhook_2',
          name: 'Webhook 2',
          url: 'https://b.com',
          secret: 'whsec_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          events: ['screenshot.failed'],
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.findAllByUser('user_1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('webhook_1');
      expect(result[1].id).toBe('webhook_2');
      expect(mockPrisma.webhook.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no webhooks', async () => {
      mockPrisma.webhook.findMany.mockResolvedValue([]);

      const result = await service.findAllByUser('user_1');

      expect(result).toEqual([]);
    });

    it('should hide secret in response', async () => {
      mockPrisma.webhook.findMany.mockResolvedValue([
        {
          id: 'webhook_1',
          name: 'Test',
          url: 'https://test.com',
          secret: 'whsec_supersecretkey12345678901234567890123456789012',
          events: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.findAllByUser('user_1');

      expect(result[0].secretPreview).toBe('whsec_supers...');
      expect(result[0]).not.toHaveProperty('secret');
    });
  });

  // ============ 获取单个 Webhook ============

  describe('findOne', () => {
    it('should return webhook when found', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue({
        id: 'webhook_1',
        name: 'Test',
        url: 'https://test.com',
        secret: 'whsec_abcdef1234567890abcdef1234567890abcdef123456',
        events: ['screenshot.completed'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findOne('webhook_1', 'user_1');

      expect(result.id).toBe('webhook_1');
      expect(mockPrisma.webhook.findFirst).toHaveBeenCalledWith({
        where: { id: 'webhook_1', userId: 'user_1' },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non_existent', 'user_1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not return webhook of other user', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(null);

      await expect(service.findOne('webhook_1', 'other_user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============ 更新 Webhook ============

  describe('update', () => {
    const updateDto = {
      name: 'Updated Webhook',
      url: 'https://new-url.com/webhook',
      events: ['screenshot.completed'] as WebhookEvent[],
      isActive: false,
    };

    it('should update webhook', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue({ id: 'webhook_1' });
      mockPrisma.webhook.update.mockResolvedValue({
        id: 'webhook_1',
        name: 'Updated Webhook',
        url: 'https://new-url.com/webhook',
        secret: 'whsec_abcdef1234567890abcdef1234567890abcdef123456',
        events: ['screenshot.completed'],
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update('webhook_1', 'user_1', updateDto);

      expect(result.name).toBe('Updated Webhook');
      expect(result.isActive).toBe(false);
      expect(mockPrisma.webhook.update).toHaveBeenCalledWith({
        where: { id: 'webhook_1' },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when webhook not found', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non_existent', 'user_1', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should verify ownership before update', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(null);

      await expect(
        service.update('webhook_1', 'other_user', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============ 删除 Webhook ============

  describe('remove', () => {
    it('should delete webhook', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue({ id: 'webhook_1' });
      mockPrisma.webhook.delete.mockResolvedValue({ id: 'webhook_1' });

      await service.remove('webhook_1', 'user_1');

      expect(mockPrisma.webhook.delete).toHaveBeenCalledWith({
        where: { id: 'webhook_1' },
      });
    });

    it('should throw NotFoundException when webhook not found', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(null);

      await expect(service.remove('non_existent', 'user_1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should verify ownership before delete', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(null);

      await expect(service.remove('webhook_1', 'other_user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============ 重新生成 Secret ============

  describe('regenerateSecret', () => {
    it('should regenerate secret', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue({
        id: 'webhook_1',
        secret: 'whsec_old_secret_123456789012345678901234567890123',
      });
      mockPrisma.webhook.update.mockResolvedValue({
        id: 'webhook_1',
        name: 'Test',
        url: 'https://test.com',
        secret: 'whsec_new_secret_987654321098765432109876543210987',
        events: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.regenerateSecret('webhook_1', 'user_1');

      expect(result.secretPreview).toMatch(/^whsec_new_se\.\.\.$/);
      expect(mockPrisma.webhook.update).toHaveBeenCalledWith({
        where: { id: 'webhook_1' },
        data: { secret: expect.stringMatching(/^whsec_[a-f0-9]{48}$/) },
      });
    });

    it('should throw NotFoundException when webhook not found', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(null);

      await expect(
        service.regenerateSecret('non_existent', 'user_1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============ 格式化输出 ============

  describe('formatWebhook', () => {
    it('should format webhook correctly', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue({
        id: 'webhook_1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        secret: 'whsec_abcdef1234567890abcdef1234567890abcdef123456',
        events: ['screenshot.completed', 'screenshot.failed'],
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });

      const result = await service.findOne('webhook_1', 'user_1');

      expect(result).toEqual({
        id: 'webhook_1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        secretPreview: 'whsec_abcdef...',
        events: ['screenshot.completed', 'screenshot.failed'],
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });
});

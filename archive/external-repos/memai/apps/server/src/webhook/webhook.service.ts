/**
 * [INPUT]: userId, CreateWebhookDto, UpdateWebhookDto
 * [OUTPUT]: Webhook, WebhookDelivery[], pagination data
 * [POS]: Webhook management service - CRUD operations and delivery log tracking
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and apps/server/src/webhook/CLAUDE.md
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma';
import type { Webhook } from '../../generated/prisma/client';
import type { CreateWebhookDto, UpdateWebhookDto } from './dto';
import { MAX_WEBHOOKS_PER_USER } from './webhook.constants';

@Injectable()
export class WebhookService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 生成 Webhook secret
   */
  private generateSecret(): string {
    return `whsec_${randomBytes(24).toString('hex')}`;
  }

  /**
   * 创建 Webhook
   */
  async create(userId: string, dto: CreateWebhookDto) {
    // 检查用户 Webhook 数量限制
    const count = await this.prisma.webhook.count({
      where: { userId },
    });

    if (count >= MAX_WEBHOOKS_PER_USER) {
      throw new BadRequestException(
        `Maximum ${MAX_WEBHOOKS_PER_USER} webhooks allowed per user`,
      );
    }

    const webhook = await this.prisma.webhook.create({
      data: {
        userId,
        name: dto.name,
        url: dto.url,
        events: dto.events,
        secret: this.generateSecret(),
      },
    });

    return this.formatWebhook(webhook);
  }

  /**
   * 获取用户的所有 Webhooks
   */
  async findAllByUser(userId: string) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map((w) => this.formatWebhook(w));
  }

  /**
   * 获取单个 Webhook
   */
  async findOne(id: string, userId: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id, userId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return this.formatWebhook(webhook);
  }

  /**
   * 更新 Webhook
   */
  async update(id: string, userId: string, dto: UpdateWebhookDto) {
    // 先检查是否存在
    const existing = await this.prisma.webhook.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Webhook not found');
    }

    const webhook = await this.prisma.webhook.update({
      where: { id },
      data: {
        name: dto.name,
        url: dto.url,
        events: dto.events,
        isActive: dto.isActive,
      },
    });

    return this.formatWebhook(webhook);
  }

  /**
   * 删除 Webhook
   */
  async remove(id: string, userId: string): Promise<void> {
    const existing = await this.prisma.webhook.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Webhook not found');
    }

    await this.prisma.webhook.delete({
      where: { id },
    });
  }

  /**
   * 重新生成 Secret
   */
  async regenerateSecret(id: string, userId: string) {
    const existing = await this.prisma.webhook.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Webhook not found');
    }

    const webhook = await this.prisma.webhook.update({
      where: { id },
      data: { secret: this.generateSecret() },
    });

    return this.formatWebhook(webhook);
  }

  /**
   * 获取 Webhook 投递日志
   */
  async getDeliveries(
    webhookId: string,
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    const { limit = 20, offset = 0 } = options;

    // 先验证 Webhook 归属
    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, userId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const [deliveries, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where: { webhookId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.webhookDelivery.count({
        where: { webhookId },
      }),
    ]);

    return {
      deliveries: deliveries.map((d) => ({
        id: d.id,
        webhookId: d.webhookId,
        event: d.event,
        statusCode: d.statusCode,
        success: d.success,
        error: d.error,
        attempts: d.attempts,
        latencyMs: d.latencyMs,
        createdAt: d.createdAt,
        deliveredAt: d.deliveredAt,
      })),
      total,
    };
  }

  /**
   * 获取用户所有 Webhook 的投递日志
   */
  async getAllDeliveries(
    userId: string,
    options: { webhookId?: string; limit?: number; offset?: number } = {},
  ) {
    const { webhookId, limit = 20, offset = 0 } = options;

    const webhookWhere = webhookId
      ? { id: webhookId, userId }
      : { userId };

    // 获取用户的 Webhook IDs
    const userWebhooks = await this.prisma.webhook.findMany({
      where: webhookWhere,
      select: { id: true, name: true },
    });

    if (userWebhooks.length === 0) {
      return { deliveries: [], total: 0 };
    }

    const webhookIds = userWebhooks.map((w) => w.id);
    const webhookNameMap = new Map(userWebhooks.map((w) => [w.id, w.name]));

    const [deliveries, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where: { webhookId: { in: webhookIds } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.webhookDelivery.count({
        where: { webhookId: { in: webhookIds } },
      }),
    ]);

    return {
      deliveries: deliveries.map((d) => ({
        id: d.id,
        webhookId: d.webhookId,
        webhookName: webhookNameMap.get(d.webhookId) || 'Unknown',
        event: d.event,
        statusCode: d.statusCode,
        success: d.success,
        error: d.error,
        attempts: d.attempts,
        latencyMs: d.latencyMs,
        createdAt: d.createdAt,
        deliveredAt: d.deliveredAt,
      })),
      total,
    };
  }

  /**
   * 格式化 Webhook 输出（隐藏 secret 后半部分）
   */
  private formatWebhook(webhook: Webhook) {
    return {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      secretPreview: webhook.secret.substring(0, 12) + '...',
      events: webhook.events,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }
}

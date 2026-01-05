/**
 * Webhook Service
 * Webhook 管理业务逻辑
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

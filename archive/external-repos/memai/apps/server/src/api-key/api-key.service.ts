/**
 * API Key Service
 *
 * [INPUT]: API Key CRUD requests
 * [OUTPUT]: API Key data and validation results
 * [POS]: Core API Key management and validation service
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import type { SubscriptionTier } from '../subscription/subscription.constants';
import type {
  CreateApiKeyInput,
  UpdateApiKeyInput,
  ApiKeyValidationResult,
  ApiKeyCreateResult,
  ApiKeyListItem,
} from './dto';
import {
  API_KEY_PREFIX,
  API_KEY_LENGTH,
  CACHE_PREFIX,
  CACHE_TTL_SECONDS,
  KEY_PREFIX_DISPLAY_LENGTH,
  API_KEY_SELECT_FIELDS,
} from './api-key.constants';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 生成新的 API Key
   * 格式: mm_<64 hex chars>
   */
  private generateKey(): string {
    const bytes = randomBytes(API_KEY_LENGTH);
    return `${API_KEY_PREFIX}${bytes.toString('hex')}`;
  }

  /**
   * 使用 SHA256 哈希 API Key
   */
  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * 提取显示用前缀
   */
  private getKeyPrefix(key: string): string {
    return key.substring(0, KEY_PREFIX_DISPLAY_LENGTH);
  }

  /**
   * 创建新的 API Key
   * @returns 包含完整密钥的结果（仅创建时返回完整密钥）
   */
  async create(userId: string, dto: CreateApiKeyInput): Promise<ApiKeyCreateResult> {
    const fullKey = this.generateKey();
    const keyHash = this.hashKey(fullKey);
    const keyPrefix = this.getKeyPrefix(fullKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name: dto.name,
        keyPrefix,
        keyHash,
        expiresAt: dto.expiresAt,
      },
    });

    this.logger.log(`API key created for user ${userId}: ${keyPrefix}...`);

    return {
      key: fullKey,
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
    };
  }

  /**
   * 获取用户的所有 API Key 列表
   */
  async findAllByUser(userId: string): Promise<ApiKeyListItem[]> {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: API_KEY_SELECT_FIELDS,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取单个 API Key（必须属于指定用户）
   */
  async findOne(userId: string, keyId: string): Promise<ApiKeyListItem> {
    const key = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
      select: API_KEY_SELECT_FIELDS,
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    return key;
  }

  /**
   * 更新 API Key
   */
  async update(
    userId: string,
    keyId: string,
    dto: UpdateApiKeyInput,
  ): Promise<ApiKeyListItem> {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
      select: { id: true, keyHash: true },
    });

    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    const updated = await this.prisma.apiKey.update({
      where: { id: keyId },
      data: {
        name: dto.name,
        isActive: dto.isActive,
      },
      select: API_KEY_SELECT_FIELDS,
    });

    // 如果 Key 被停用，清除缓存
    if (dto.isActive === false) {
      await this.invalidateCache(existing.keyHash);
    }

    this.logger.log(`API key updated: ${keyId}`);

    return updated;
  }

  /**
   * 删除 API Key（硬删除）
   */
  async delete(userId: string, keyId: string): Promise<void> {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
      select: { id: true, keyHash: true },
    });

    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.delete({
      where: { id: keyId },
    });

    await this.invalidateCache(existing.keyHash);

    this.logger.log(`API key deleted: ${keyId}`);
  }

  /**
   * 验证 API Key
   * @returns 验证结果（包含用户信息）
   * @throws ForbiddenException 如果 Key 无效
   */
  async validateKey(apiKey: string): Promise<ApiKeyValidationResult> {
    if (!apiKey || !apiKey.startsWith(API_KEY_PREFIX)) {
      throw new ForbiddenException('Invalid API key format');
    }

    const keyHash = this.hashKey(apiKey);

    // 先检查缓存
    const cached = await this.getFromCache(keyHash);
    if (cached) {
      this.updateLastUsedAsync(cached.id);
      return cached;
    }

    // 查询数据库
    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        user: {
          include: {
            subscription: {
              select: { tier: true },
            },
          },
        },
      },
    });

    if (!key) {
      throw new ForbiddenException('Invalid API key');
    }

    if (!key.isActive) {
      throw new ForbiddenException('API key is inactive');
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new ForbiddenException('API key has expired');
    }

    if (key.user.deletedAt) {
      throw new ForbiddenException('User account has been deleted');
    }

    const result: ApiKeyValidationResult = {
      id: key.id,
      userId: key.userId,
      name: key.name,
      user: {
        id: key.user.id,
        email: key.user.email,
        name: key.user.name,
        tier: (key.user.subscription?.tier || 'FREE') as SubscriptionTier,
        isAdmin: key.user.isAdmin,
      },
    };

    // 缓存结果
    await this.setCache(keyHash, result);

    this.updateLastUsedAsync(key.id);

    return result;
  }

  /**
   * 异步更新 lastUsedAt（不阻塞请求）
   */
  private updateLastUsedAsync(keyId: string): void {
    this.prisma.apiKey
      .update({
        where: { id: keyId },
        data: { lastUsedAt: new Date() },
      })
      .catch((err) => {
        this.logger.error(`Failed to update lastUsedAt: ${err.message}`);
      });
  }

  /**
   * 从缓存获取验证结果
   */
  private async getFromCache(keyHash: string): Promise<ApiKeyValidationResult | null> {
    try {
      const cached = await this.redis.get(`${CACHE_PREFIX}${keyHash}`);
      if (cached) {
        return JSON.parse(cached) as ApiKeyValidationResult;
      }
    } catch (err) {
      this.logger.warn(`Cache read error: ${(err as Error).message}`);
    }
    return null;
  }

  /**
   * 缓存验证结果
   */
  private async setCache(keyHash: string, result: ApiKeyValidationResult): Promise<void> {
    try {
      await this.redis.set(
        `${CACHE_PREFIX}${keyHash}`,
        JSON.stringify(result),
        CACHE_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(`Cache write error: ${(err as Error).message}`);
    }
  }

  /**
   * 清除缓存
   */
  private async invalidateCache(keyHash: string): Promise<void> {
    try {
      await this.redis.del(`${CACHE_PREFIX}${keyHash}`);
    } catch (err) {
      this.logger.warn(`Cache invalidate error: ${(err as Error).message}`);
    }
  }
}

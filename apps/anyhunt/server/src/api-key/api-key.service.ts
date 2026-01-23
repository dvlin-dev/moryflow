/**
 * [INPUT]: CreateApiKeyDto, UpdateApiKeyDto, plaintext key for validation
 * [OUTPUT]: ApiKeyValidationResult, ApiKeyCreateResult, ApiKeyListItem[]
 * [POS]: API key lifecycle management - create, validate, revoke
 *        删除时清理向量库关联数据（Memory, Entity, Relation）
 *
 * [PROTOCOL]: When this file changes, update this header and src/api-key/CLAUDE.md
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { VectorPrismaService } from '../vector-prisma/vector-prisma.service';
import { RedisService } from '../redis/redis.service';
import type { CreateApiKeyDto } from './dto/create-api-key.dto';
import type { UpdateApiKeyDto } from './dto/update-api-key.dto';
import type { SubscriptionTier } from '../types/tier.types';
import type {
  ApiKeyValidationResult,
  ApiKeyCreateResult,
  ApiKeyListItem,
} from './api-key.types';
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
    private readonly vectorPrisma: VectorPrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 生成新的 API Key
   * 格式: ah_<64 hex chars>
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
  async create(
    userId: string,
    dto: CreateApiKeyDto,
  ): Promise<ApiKeyCreateResult> {
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
    dto: UpdateApiKeyDto,
  ): Promise<ApiKeyListItem> {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
      select: {
        id: true,
        keyHash: true,
      },
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
    if (dto.isActive !== undefined) {
      await this.invalidateCache(existing.keyHash);
    }

    this.logger.log(`API key updated: ${keyId}`);

    return updated;
  }

  /**
   * 删除 API Key（硬删除）
   * 同时异步清理向量库中的关联数据（Memory, Entity, Relation）
   */
  async delete(userId: string, keyId: string): Promise<void> {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
      select: { id: true, keyHash: true },
    });

    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    // 1. 先删除主库中的 ApiKey（核心操作，必须成功）
    await this.prisma.apiKey.delete({
      where: { id: keyId },
    });

    await this.invalidateCache(existing.keyHash);

    this.logger.log(`API key deleted: ${keyId}`);

    // 2. 异步清理向量库数据（fail-safe，不阻塞主流程）
    this.cleanupVectorDataAsync(keyId);
  }

  /**
   * 异步清理向量库中的关联数据（fail-safe）
   * 按依赖顺序：先 Relation，再 Entity，最后 Memory
   */
  private cleanupVectorDataAsync(apiKeyId: string): void {
    void (async () => {
      try {
        await this.vectorPrisma.relation.deleteMany({
          where: { apiKeyId },
        });
        await this.vectorPrisma.entity.deleteMany({
          where: { apiKeyId },
        });
        await this.vectorPrisma.memory.deleteMany({
          where: { apiKeyId },
        });
        this.logger.log(
          `Vector data cleanup completed for apiKey: ${apiKeyId}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to cleanup vector data for apiKey ${apiKeyId}: ${(error as Error).message}`,
        );
      }
    })();
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
        subscriptionTier: (key.user.subscription?.tier ||
          'FREE') as SubscriptionTier,
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
      .catch((err: Error) => {
        this.logger.error(`Failed to update lastUsedAt: ${err.message}`);
      });
  }

  /**
   * 从缓存获取验证结果
   */
  private async getFromCache(
    keyHash: string,
  ): Promise<ApiKeyValidationResult | null> {
    try {
      const cached = await this.redis.get(`${CACHE_PREFIX}${keyHash}`);
      if (cached) {
        return this.normalizeCachedValidationResult(JSON.parse(cached));
      }
    } catch (err) {
      this.logger.warn(`Cache read error: ${(err as Error).message}`);
    }
    return null;
  }

  private normalizeCachedValidationResult(
    value: unknown,
  ): ApiKeyValidationResult | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const raw = value as Record<string, unknown>;
    const rawUser = raw.user;
    if (!rawUser || typeof rawUser !== 'object') {
      return null;
    }

    const user = rawUser as Record<string, unknown>;

    if (
      typeof raw.id !== 'string' ||
      typeof raw.userId !== 'string' ||
      typeof raw.name !== 'string' ||
      typeof user.id !== 'string' ||
      typeof user.email !== 'string'
    ) {
      return null;
    }

    return {
      id: raw.id,
      userId: raw.userId,
      name: raw.name,
      user: {
        id: user.id,
        email: user.email,
        name: typeof user.name === 'string' ? user.name : null,
        subscriptionTier:
          typeof user.subscriptionTier === 'string'
            ? (user.subscriptionTier as SubscriptionTier)
            : 'FREE',
        isAdmin: user.isAdmin === true,
      },
    };
  }

  /**
   * 缓存验证结果
   */
  private async setCache(
    keyHash: string,
    result: ApiKeyValidationResult,
  ): Promise<void> {
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

/**
 * [INPUT]: apiKeyId + Prisma 模型 Delegate
 * [OUTPUT]: 带 apiKeyId 隔离的 CRUD 结果（类型由具体 Repository 指定）
 * [POS]: 带数据隔离的基础 Repository（所有带 apiKeyId 的核心表应继承）
 *
 * 职责：提供带 apiKeyId 隔离的基础 CRUD 操作
 * 所有核心数据表的 Repository 应继承此类
 *
 * 设计策略（方案 A）：使用显式模型类型泛型，而非 Prisma TypeMap 抽象
 * - TModel：具体模型类型（如 Entity, Memory, Relation）
 * - 避免 TypeMap 推断导致字段变成 optional 的问题
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及 src/common/CLAUDE.md
 */

import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 基础模型约束：必须有 id 和 apiKeyId 字段
 */
interface BaseModel {
  id: string;
  apiKeyId: string;
}

/**
 * Prisma Delegate 接口（简化版，使用 any 类型处理复杂的 Prisma 泛型）
 */
interface PrismaDelegate {
  findMany(args: unknown): Promise<unknown[]>;
  findFirst(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  createMany(args: unknown): Promise<{ count: number }>;
  update(args: unknown): Promise<unknown>;
  deleteMany(args: unknown): Promise<{ count: number }>;
  count(args: unknown): Promise<number>;
}

/**
 * 查询选项类型（不含 select/include/omit）
 */
export interface FindManyOptions<TWhere = Record<string, unknown>> {
  where?: TWhere;
  orderBy?: unknown;
  take?: number;
  skip?: number;
  cursor?: unknown;
}

/**
 * 创建数据类型（不含 apiKeyId）
 */
export type CreateData<TModel> = Omit<
  TModel,
  'id' | 'apiKeyId' | 'createdAt' | 'updatedAt'
>;

/**
 * 更新数据类型（部分字段，不含 apiKeyId）
 */
export type UpdateData<TModel> = Partial<
  Omit<TModel, 'id' | 'apiKeyId' | 'createdAt' | 'updatedAt'>
>;

export abstract class BaseRepository<TModel extends BaseModel> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly delegate: PrismaDelegate,
  ) {}

  /**
   * 获取 Prisma 服务实例（只读访问）
   */
  getPrisma(): PrismaService {
    return this.prisma;
  }

  /**
   * 自动添加 apiKeyId 过滤条件
   */
  protected withApiKeyFilter<TWhere extends Record<string, unknown>>(
    apiKeyId: string,
    where?: TWhere,
  ): TWhere & { apiKeyId: string } {
    return { ...(where ?? ({} as TWhere)), apiKeyId };
  }

  /**
   * 查询多条记录（带数据隔离）
   */
  async findMany(
    apiKeyId: string,
    options?: FindManyOptions,
  ): Promise<TModel[]> {
    const resolvedOptions = options ?? {};
    const payload = {
      ...resolvedOptions,
      where: this.withApiKeyFilter(apiKeyId, resolvedOptions.where),
    };

    return this.delegate.findMany(payload) as Promise<TModel[]>;
  }

  /**
   * 查询单条记录（带数据隔离）
   */
  async findOne(
    apiKeyId: string,
    where: Record<string, unknown>,
  ): Promise<TModel | null> {
    const payload = {
      where: this.withApiKeyFilter(apiKeyId, where),
    };

    return this.delegate.findFirst(payload) as Promise<TModel | null>;
  }

  /**
   * 根据 ID 查询单条记录（带数据隔离）
   */
  async findById(apiKeyId: string, id: string): Promise<TModel | null> {
    return this.findOne(apiKeyId, { id });
  }

  /**
   * 创建记录（自动注入 apiKeyId）
   */
  async create(apiKeyId: string, data: CreateData<TModel>): Promise<TModel> {
    const payload = {
      data: { ...(data as Record<string, unknown>), apiKeyId },
    };

    return this.delegate.create(payload) as Promise<TModel>;
  }

  /**
   * 批量创建记录（自动注入 apiKeyId）
   */
  async createMany(
    apiKeyId: string,
    data: CreateData<TModel>[],
  ): Promise<{ count: number }> {
    const payload = {
      data: data.map((item) => ({
        ...(item as Record<string, unknown>),
        apiKeyId,
      })),
    };

    return this.delegate.createMany(payload);
  }

  /**
   * 更新记录（带数据隔离验证）
   */
  async update(
    apiKeyId: string,
    where: Record<string, unknown>,
    data: UpdateData<TModel>,
  ): Promise<TModel> {
    // 先验证记录属于该 apiKeyId
    const existing = await this.findOne(apiKeyId, where);
    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    const payload = {
      where: { id: existing.id },
      data,
    };

    return this.delegate.update(payload) as Promise<TModel>;
  }

  /**
   * 根据 ID 更新记录（带数据隔离验证）
   */
  async updateById(
    apiKeyId: string,
    id: string,
    data: UpdateData<TModel>,
  ): Promise<TModel> {
    return this.update(apiKeyId, { id }, data);
  }

  /**
   * 删除记录（带数据隔离）
   */
  async delete(
    apiKeyId: string,
    where: Record<string, unknown>,
  ): Promise<void> {
    const payload = {
      where: this.withApiKeyFilter(apiKeyId, where),
    };

    await this.delegate.deleteMany(payload);
  }

  /**
   * 根据 ID 删除记录（带数据隔离）
   */
  async deleteById(apiKeyId: string, id: string): Promise<void> {
    await this.delete(apiKeyId, { id });
  }

  /**
   * 统计记录数（带数据隔离）
   */
  async count(
    apiKeyId: string,
    where?: Record<string, unknown>,
  ): Promise<number> {
    const payload = {
      where: this.withApiKeyFilter(apiKeyId, where ?? {}),
    };

    return this.delegate.count(payload);
  }

  /**
   * 检查记录是否存在（带数据隔离）
   */
  async exists(
    apiKeyId: string,
    where: Record<string, unknown>,
  ): Promise<boolean> {
    const count = await this.count(apiKeyId, where);
    return count > 0;
  }
}

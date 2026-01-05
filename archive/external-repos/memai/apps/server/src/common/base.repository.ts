/**
 * [POS]: 带数据隔离的基础 Repository
 *
 * 职责：提供带 apiKeyId 隔离的基础 CRUD 操作
 * 所有核心数据表的 Repository 应继承此类
 */

import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FindManyOptions {
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  take?: number;
  skip?: number;
  include?: Record<string, boolean>;
}

export abstract class BaseRepository<T> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
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
  protected withApiKeyFilter(apiKeyId: string, where: Record<string, any> = {}): Record<string, any> {
    return { ...where, apiKeyId };
  }

  /**
   * 查询多条记录（带数据隔离）
   */
  async findMany(apiKeyId: string, options: FindManyOptions = {}): Promise<T[]> {
    const model = (this.prisma as any)[this.modelName];
    return model.findMany({
      ...options,
      where: this.withApiKeyFilter(apiKeyId, options.where),
    });
  }

  /**
   * 查询单条记录（带数据隔离）
   */
  async findOne(apiKeyId: string, where: Record<string, any>): Promise<T | null> {
    const model = (this.prisma as any)[this.modelName];
    return model.findFirst({
      where: this.withApiKeyFilter(apiKeyId, where),
    });
  }

  /**
   * 根据 ID 查询单条记录（带数据隔离）
   */
  async findById(apiKeyId: string, id: string): Promise<T | null> {
    return this.findOne(apiKeyId, { id });
  }

  /**
   * 创建记录（自动注入 apiKeyId）
   */
  async create(apiKeyId: string, data: Record<string, any>): Promise<T> {
    const model = (this.prisma as any)[this.modelName];
    return model.create({
      data: { ...data, apiKeyId },
    });
  }

  /**
   * 批量创建记录（自动注入 apiKeyId）
   */
  async createMany(apiKeyId: string, data: Record<string, any>[]): Promise<{ count: number }> {
    const model = (this.prisma as any)[this.modelName];
    return model.createMany({
      data: data.map((item) => ({ ...item, apiKeyId })),
    });
  }

  /**
   * 更新记录（带数据隔离验证）
   */
  async update(apiKeyId: string, where: Record<string, any>, data: Record<string, any>): Promise<T> {
    // 先验证记录属于该 apiKeyId
    const existing = await this.findOne(apiKeyId, where);
    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    const model = (this.prisma as any)[this.modelName];
    return model.update({
      where: { id: (existing as any).id },
      data,
    });
  }

  /**
   * 根据 ID 更新记录（带数据隔离验证）
   */
  async updateById(apiKeyId: string, id: string, data: Record<string, any>): Promise<T> {
    return this.update(apiKeyId, { id }, data);
  }

  /**
   * 删除记录（带数据隔离）
   */
  async delete(apiKeyId: string, where: Record<string, any>): Promise<void> {
    const model = (this.prisma as any)[this.modelName];
    await model.deleteMany({
      where: this.withApiKeyFilter(apiKeyId, where),
    });
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
  async count(apiKeyId: string, where: Record<string, any> = {}): Promise<number> {
    const model = (this.prisma as any)[this.modelName];
    return model.count({
      where: this.withApiKeyFilter(apiKeyId, where),
    });
  }

  /**
   * 检查记录是否存在（带数据隔离）
   */
  async exists(apiKeyId: string, where: Record<string, any>): Promise<boolean> {
    const count = await this.count(apiKeyId, where);
    return count > 0;
  }
}

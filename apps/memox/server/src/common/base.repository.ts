/**
 * [INPUT]: apiKeyId + Prisma 模型 Delegate（MemoryDelegate/EntityDelegate/RelationDelegate...）
 * [OUTPUT]: 带 apiKeyId 隔离的 CRUD 结果（类型由 Prisma 推断）
 * [POS]: 带数据隔离的基础 Repository（所有带 apiKeyId 的核心表应继承）
 *
 * 职责：提供带 apiKeyId 隔离的基础 CRUD 操作
 * 所有核心数据表的 Repository 应继承此类
 *
 * 注意：通过 Prisma.Args / Prisma.Result 推断参数与返回，避免 unknown/any
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及 apps/memox/server/src/common/CLAUDE.md
 */

import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ModelName = keyof Prisma.TypeMap['model'];
type ModelTypeMap<TModel extends ModelName> = Prisma.TypeMap['model'][TModel];

type OperationArgs<
  TModel extends ModelName,
  TOperation extends keyof ModelTypeMap<TModel>['operations'],
> = ModelTypeMap<TModel>['operations'][TOperation]['args'];

type OperationResult<
  TModel extends ModelName,
  TOperation extends keyof ModelTypeMap<TModel>['operations'],
> = ModelTypeMap<TModel>['operations'][TOperation]['result'];

type WithoutSelectIncludeOmit<TArgs> = Omit<
  TArgs,
  'select' | 'include' | 'omit'
>;
type WhereInput<TArgs> = TArgs extends { where?: infer W } ? W : never;
type EnsureHasApiKeyId<TWhere> = TWhere extends { apiKeyId?: unknown }
  ? TWhere
  : never;
type DataInput<TArgs> = TArgs extends { data: infer D } ? D : never;
type ArrayElement<T> =
  T extends ReadonlyArray<infer U> ? U : T extends (infer U)[] ? U : T;
type WithoutApiKeyId<T> = T extends object ? Omit<T, 'apiKeyId'> : T;

type FindManyArgs<TModel extends ModelName> = WithoutSelectIncludeOmit<
  OperationArgs<TModel, 'findMany'>
>;
type FindFirstArgs<TModel extends ModelName> = WithoutSelectIncludeOmit<
  OperationArgs<TModel, 'findFirst'>
>;
type CreateArgs<TModel extends ModelName> = WithoutSelectIncludeOmit<
  OperationArgs<TModel, 'create'>
>;
type CreateManyArgs<TModel extends ModelName> = WithoutSelectIncludeOmit<
  OperationArgs<TModel, 'createMany'>
>;
type UpdateArgs<TModel extends ModelName> = WithoutSelectIncludeOmit<
  OperationArgs<TModel, 'update'>
>;
type DeleteManyArgs<TModel extends ModelName> = WithoutSelectIncludeOmit<
  OperationArgs<TModel, 'deleteMany'>
>;

type ModelRecord<TModel extends ModelName> = NonNullable<
  OperationResult<TModel, 'findFirst'>
> & { id: string };

type CrudDelegate<TModel extends ModelName> = {
  findMany(
    args: FindManyArgs<TModel>,
  ): Prisma.PrismaPromise<OperationResult<TModel, 'findMany'>>;
  findFirst(
    args: FindFirstArgs<TModel>,
  ): Prisma.PrismaPromise<OperationResult<TModel, 'findFirst'>>;
  create(
    args: CreateArgs<TModel>,
  ): Prisma.PrismaPromise<OperationResult<TModel, 'create'>>;
  createMany(
    args: CreateManyArgs<TModel>,
  ): Prisma.PrismaPromise<OperationResult<TModel, 'createMany'>>;
  update(
    args: UpdateArgs<TModel>,
  ): Prisma.PrismaPromise<OperationResult<TModel, 'update'>>;
  deleteMany(
    args: DeleteManyArgs<TModel>,
  ): Prisma.PrismaPromise<OperationResult<TModel, 'deleteMany'>>;
  count(args: { where?: unknown; select: true }): Prisma.PrismaPromise<number>;
};

export abstract class BaseRepository<TModel extends ModelName> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly delegate: CrudDelegate<TModel>,
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
  protected withApiKeyFilter<TWhere extends { apiKeyId?: unknown }>(
    apiKeyId: string,
    where?: TWhere,
  ): TWhere {
    return { ...(where ?? {}), apiKeyId } as TWhere;
  }

  /**
   * 查询多条记录（带数据隔离）
   */
  async findMany(
    apiKeyId: string,
    options?: FindManyArgs<TModel>,
  ): Promise<OperationResult<TModel, 'findMany'>> {
    type TWhere = EnsureHasApiKeyId<WhereInput<FindManyArgs<TModel>>>;

    const resolvedOptions = (options ?? {}) as FindManyArgs<TModel>;
    const payload = {
      ...resolvedOptions,
      where: this.withApiKeyFilter(
        apiKeyId,
        resolvedOptions.where as TWhere | undefined,
      ),
    } as FindManyArgs<TModel>;

    return this.delegate.findMany(payload);
  }

  /**
   * 查询单条记录（带数据隔离）
   */
  async findOne(
    apiKeyId: string,
    where: EnsureHasApiKeyId<WhereInput<FindFirstArgs<TModel>>>,
  ): Promise<OperationResult<TModel, 'findFirst'>> {
    const payload = {
      where: this.withApiKeyFilter(apiKeyId, where),
    } as FindFirstArgs<TModel>;

    return this.delegate.findFirst(payload);
  }

  /**
   * 根据 ID 查询单条记录（带数据隔离）
   */
  async findById(
    apiKeyId: string,
    id: string,
  ): Promise<OperationResult<TModel, 'findFirst'>> {
    return this.findOne(apiKeyId, { id } as unknown as EnsureHasApiKeyId<
      WhereInput<FindFirstArgs<TModel>>
    >);
  }

  /**
   * 创建记录（自动注入 apiKeyId）
   */
  async create(
    apiKeyId: string,
    data: WithoutApiKeyId<DataInput<CreateArgs<TModel>>>,
  ): Promise<OperationResult<TModel, 'create'>> {
    const payload = {
      data: { ...(data as Record<string, unknown>), apiKeyId },
    } as CreateArgs<TModel>;

    return this.delegate.create(payload);
  }

  /**
   * 批量创建记录（自动注入 apiKeyId）
   */
  createMany(
    apiKeyId: string,
    data: WithoutApiKeyId<ArrayElement<DataInput<CreateManyArgs<TModel>>>>[],
  ): Promise<OperationResult<TModel, 'createMany'>> {
    const payload = {
      data: data.map((item) => ({
        ...(item as Record<string, unknown>),
        apiKeyId,
      })),
    } as CreateManyArgs<TModel>;

    return this.delegate.createMany(payload);
  }

  /**
   * 更新记录（带数据隔离验证）
   */
  async update(
    apiKeyId: string,
    where: EnsureHasApiKeyId<WhereInput<FindFirstArgs<TModel>>>,
    data: WithoutApiKeyId<DataInput<UpdateArgs<TModel>>>,
  ): Promise<OperationResult<TModel, 'update'>> {
    // 先验证记录属于该 apiKeyId
    const existing = await this.findOne(apiKeyId, where);
    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    const record = existing as ModelRecord<TModel>;

    const payload = {
      where: { id: record.id },
      data,
    } as UpdateArgs<TModel>;

    return this.delegate.update(payload);
  }

  /**
   * 根据 ID 更新记录（带数据隔离验证）
   */
  async updateById(
    apiKeyId: string,
    id: string,
    data: WithoutApiKeyId<DataInput<UpdateArgs<TModel>>>,
  ): Promise<OperationResult<TModel, 'update'>> {
    return this.update(
      apiKeyId,
      { id } as unknown as EnsureHasApiKeyId<WhereInput<FindFirstArgs<TModel>>>,
      data,
    );
  }

  /**
   * 删除记录（带数据隔离）
   */
  async delete(
    apiKeyId: string,
    where: EnsureHasApiKeyId<WhereInput<DeleteManyArgs<TModel>>>,
  ): Promise<void> {
    const payload = {
      where: this.withApiKeyFilter(apiKeyId, where ?? {}),
    } as DeleteManyArgs<TModel>;

    await this.delegate.deleteMany(payload);
  }

  /**
   * 根据 ID 删除记录（带数据隔离）
   */
  async deleteById(apiKeyId: string, id: string): Promise<void> {
    await this.delete(apiKeyId, { id } as unknown as EnsureHasApiKeyId<
      WhereInput<DeleteManyArgs<TModel>>
    >);
  }

  /**
   * 统计记录数（带数据隔离）
   */
  count(
    apiKeyId: string,
    where?: EnsureHasApiKeyId<WhereInput<OperationArgs<TModel, 'count'>>>,
  ): Promise<number> {
    return this.delegate.count({
      where: this.withApiKeyFilter(apiKeyId, where ?? {}),
      select: true,
    });
  }

  /**
   * 检查记录是否存在（带数据隔离）
   */
  async exists(
    apiKeyId: string,
    where: EnsureHasApiKeyId<WhereInput<OperationArgs<TModel, 'count'>>>,
  ): Promise<boolean> {
    const count = await this.count(apiKeyId, where);
    return count > 0;
  }
}

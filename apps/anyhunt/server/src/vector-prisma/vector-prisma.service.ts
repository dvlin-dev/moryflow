/**
 * [INPUT]: VECTOR_DATABASE_URL 环境变量
 * [OUTPUT]: 向量数据库 PrismaClient 实例
 * [POS]: Memox 向量数据库连接服务
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma-vector/client';

@Injectable()
export class VectorPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(VectorPrismaService.name);

  constructor() {
    const connectionString = process.env.VECTOR_DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'VECTOR_DATABASE_URL environment variable is required for vector database connection',
      );
    }

    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Vector database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Vector database disconnected');
  }
}

/**
 * [INPUT]: DATABASE_URL 环境变量
 * [OUTPUT]: 主数据库 PrismaClient 实例
 * [POS]: 业务数据库连接服务（不含向量数据）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma-main/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

/**
 * [PROVIDES]: VectorPrismaService + VectorPgService - 向量数据库 ORM / raw pg 连接
 * [POS]: 全局模块，供 Memox 相关模块使用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header
 */

import { Global, Module } from '@nestjs/common';
import { VectorPrismaService } from './vector-prisma.service';
import { VectorPgService } from './vector-pg.service';

@Global()
@Module({
  providers: [VectorPrismaService, VectorPgService],
  exports: [VectorPrismaService, VectorPgService],
})
export class VectorPrismaModule {}

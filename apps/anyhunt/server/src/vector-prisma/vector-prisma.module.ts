/**
 * [PROVIDES]: VectorPrismaService - 向量数据库连接
 * [POS]: 全局模块，供 Memox 相关模块使用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header
 */

import { Global, Module } from '@nestjs/common';
import { VectorPrismaService } from './vector-prisma.service';

@Global()
@Module({
  providers: [VectorPrismaService],
  exports: [VectorPrismaService],
})
export class VectorPrismaModule {}

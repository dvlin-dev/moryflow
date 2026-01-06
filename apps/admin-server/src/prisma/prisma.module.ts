/**
 * [PROVIDES]: PrismaModule - 数据库客户端模块
 * [DEPENDS]: @aiget/identity-db, @prisma/adapter-pg
 * [POS]: 统一管理后台数据库模块
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '@aiget/identity-db';
import { PrismaPg } from '@prisma/adapter-pg';

export const IDENTITY_PRISMA = Symbol('IDENTITY_PRISMA');

// 全局单例（避免热重载时创建多个连接）
const globalForPrisma = globalThis as unknown as {
  identityPrisma: PrismaClient | undefined;
};

function createIdentityPrismaClient(): PrismaClient {
  // Prisma 7 需要 adapter
  const adapter = new PrismaPg({
    connectionString: process.env.IDENTITY_DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

const identityPrisma = globalForPrisma.identityPrisma ?? createIdentityPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.identityPrisma = identityPrisma;
}

@Global()
@Module({
  providers: [
    {
      provide: IDENTITY_PRISMA,
      useValue: identityPrisma,
    },
  ],
  exports: [IDENTITY_PRISMA],
})
export class PrismaModule {}

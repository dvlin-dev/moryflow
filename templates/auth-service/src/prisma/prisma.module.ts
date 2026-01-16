/**
 * [PROVIDES]: PrismaModule - Identity DB Prisma 客户端
 * [DEPENDS]: /identity-db, @prisma/adapter-pg
 * [POS]: Auth Service 数据库连接模块
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 templates/auth-service/README.md
 */

import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '@anyhunt/identity-db';
import { PrismaPg } from '@prisma/adapter-pg';

export const IDENTITY_PRISMA = Symbol('IDENTITY_PRISMA');

const globalForPrisma = globalThis as unknown as {
  identityPrisma: PrismaClient | undefined;
};

function createIdentityPrismaClient(): PrismaClient {
  const connectionString = process.env.IDENTITY_DATABASE_URL;
  if (!connectionString) {
    throw new Error('IDENTITY_DATABASE_URL must be set');
  }

  const adapter = new PrismaPg({ connectionString });
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

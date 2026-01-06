/**
 * [PROVIDES]: AuthModule - 认证模块
 * [DEPENDS]: @aiget/auth-server, @aiget/identity-db
 * [POS]: 统一管理后台认证模块
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import { Module } from '@nestjs/common';
import {
  AuthFacadeController,
  AuthFacadeService,
  createBetterAuth,
  AUTH_INSTANCE,
  IDENTITY_PRISMA as AUTH_IDENTITY_PRISMA,
} from '@aiget/auth-server';
import { PrismaClient } from '@aiget/identity-db';
import { IDENTITY_PRISMA } from '../prisma/prisma.module';

// 全局单例 auth 实例
let authInstance: ReturnType<typeof createBetterAuth> | undefined;

function createAuthInstance(prisma: PrismaClient) {
  if (!authInstance) {
    authInstance = createBetterAuth(
      prisma,
      async (email, otp, type) => {
        // TODO: 实现邮件发送逻辑
        console.log(`[Admin Server] Send OTP to ${email}: ${otp} (${type})`);
      },
      {
        baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001/api/auth',
      }
    );
  }
  return authInstance;
}

@Module({
  controllers: [AuthFacadeController],
  providers: [
    AuthFacadeService,
    {
      provide: AUTH_INSTANCE,
      useFactory: (prisma: PrismaClient) => createAuthInstance(prisma),
      inject: [IDENTITY_PRISMA],
    },
    {
      provide: AUTH_IDENTITY_PRISMA,
      useExisting: IDENTITY_PRISMA,
    },
  ],
})
export class AuthModule {}

/**
 * [PROVIDES]: AuthModule - Auth Facade 接入模块
 * [DEPENDS]: /auth-server, /identity-db
 * [POS]: Auth Service 认证模块
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 templates/auth-service/README.md
 */

import { Global, Module } from '@nestjs/common';
import {
  AuthFacadeController,
  AuthFacadeService,
  createBetterAuth,
  AUTH_INSTANCE,
  IDENTITY_PRISMA as AUTH_IDENTITY_PRISMA,
  JwtGuard,
  type CreateBetterAuthOptions,
} from '@anyhunt/auth-server';
import { PrismaClient } from '@anyhunt/identity-db';
import { IDENTITY_PRISMA } from '../prisma/prisma.module';

let authInstance: ReturnType<typeof createBetterAuth> | undefined;

function parseOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function buildGoogleConfig(): CreateBetterAuthOptions['google'] | undefined {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return undefined;
  return { clientId, clientSecret };
}

function buildAppleConfig(): CreateBetterAuthOptions['apple'] | undefined {
  const clientId = process.env.APPLE_CLIENT_ID;
  const clientSecret = process.env.APPLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return undefined;
  return { clientId, clientSecret };
}

function createAuthInstance(prisma: PrismaClient) {
  if (!authInstance) {
    const trustedOrigins = parseOrigins(process.env.TRUSTED_ORIGINS);
    const options: CreateBetterAuthOptions = {
      baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000/api/v1/auth',
      trustedOrigins: trustedOrigins.length > 0 ? trustedOrigins : undefined,
    };

    const google = buildGoogleConfig();
    if (google) options.google = google;

    const apple = buildAppleConfig();
    if (apple) options.apple = apple;

    authInstance = createBetterAuth(
      prisma,
      async (email, otp, type) => {
        // TODO: 替换为真实的邮件发送逻辑
        console.log(`[Auth Service] Send OTP to ${email}: ${otp} (${type})`);
      },
      options
    );
  }

  return authInstance;
}

@Global()
@Module({
  controllers: [AuthFacadeController],
  providers: [
    AuthFacadeService,
    JwtGuard,
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
  exports: [AUTH_INSTANCE, AUTH_IDENTITY_PRISMA, JwtGuard],
})
export class AuthModule {}

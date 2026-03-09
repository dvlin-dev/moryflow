/**
 * [INPUT]: AuthService/AuthTokensService + AuthController/AuthTokensController
 * [OUTPUT]: 全局认证模块（Guard + Token 服务复用）
 * [POS]: 统一认证与 Guard 注册入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthSignupController } from './auth-signup.controller';
import { AuthSignupService } from './auth-signup.service';
import { AuthController } from './auth.controller';
import { AuthSocialController } from './auth-social.controller';
import { AuthTokensController } from './auth.tokens.controller';
import { AuthGuard } from './auth.guard';
import { AuthTokensService } from './auth.tokens.service';
import { AuthSocialService } from './auth-social.service';
import { AuthProvisioningService } from './auth-provisioning.service';

@Global()
@Module({
  controllers: [
    AuthTokensController,
    AuthSocialController,
    AuthSignupController,
    AuthController,
  ],
  providers: [
    AuthService,
    AuthTokensService,
    AuthSocialService,
    AuthSignupService,
    AuthProvisioningService,
    AuthGuard,
    {
      provide: APP_GUARD,
      useExisting: AuthGuard,
    },
  ],
  exports: [AuthService, AuthTokensService, AuthGuard, AuthProvisioningService],
})
export class AuthModule {}

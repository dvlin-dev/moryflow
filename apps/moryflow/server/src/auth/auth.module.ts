/**
 * [INPUT]: AuthService/AuthTokensService + AuthController/AuthTokensController
 * [OUTPUT]: 全局认证模块（Guard + Token 服务复用）
 * [POS]: 统一认证与 Guard 注册入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthTokensController } from './auth.tokens.controller';
import { AuthGuard } from './auth.guard';
import { AuthTokensService } from './auth.tokens.service';

@Global()
@Module({
  controllers: [AuthTokensController, AuthController],
  providers: [
    AuthService,
    AuthTokensService,
    AuthGuard,
    {
      provide: APP_GUARD,
      useExisting: AuthGuard,
    },
  ],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}

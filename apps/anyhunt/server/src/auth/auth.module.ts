import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AdminGuard } from './admin.guard';
import { AuthTokensController } from './auth.tokens.controller';
import { AuthTokensService } from './auth.tokens.service';
import { RedisModule } from '../redis';

@Module({
  imports: [RedisModule],
  controllers: [AuthTokensController, AuthController],
  providers: [
    AuthService,
    AuthTokensService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AdminGuard,
    },
  ],
  exports: [AuthService, AuthTokensService],
})
export class AuthModule {}

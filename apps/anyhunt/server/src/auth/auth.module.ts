import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AdminGuard } from './admin.guard';
import { OptionalAuthGuard } from './optional-auth.guard';
import { AuthTokensController } from './auth.tokens.controller';
import { AuthTokensService } from './auth.tokens.service';
import { RedisModule } from '../redis';

@Module({
  imports: [RedisModule],
  controllers: [AuthTokensController, AuthController],
  providers: [
    AuthService,
    AuthTokensService,
    OptionalAuthGuard,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AdminGuard,
    },
  ],
  exports: [AuthService, AuthTokensService, OptionalAuthGuard],
})
export class AuthModule {}

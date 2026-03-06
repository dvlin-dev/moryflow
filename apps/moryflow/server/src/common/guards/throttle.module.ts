/**
 * [INPUT]: ConfigService + RedisService
 * [OUTPUT]: 全局限流配置对象与 Redis ThrottlerStorage Provider
 * [POS]: 限流基础设施模块（供 AppModule 组合）
 */

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisModule } from '../../redis';
import { RedisThrottlerStorageService } from './redis-throttler.storage';
import { getGlobalThrottleConfig } from './throttle.config';
import { GLOBAL_THROTTLE_CONFIG } from './throttle.constants';

@Module({
  imports: [RedisModule],
  providers: [
    RedisThrottlerStorageService,
    {
      provide: GLOBAL_THROTTLE_CONFIG,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getGlobalThrottleConfig(configService),
    },
  ],
  exports: [RedisThrottlerStorageService, GLOBAL_THROTTLE_CONFIG],
})
export class ThrottleModule {}

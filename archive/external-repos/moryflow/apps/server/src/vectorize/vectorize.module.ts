import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { VectorizeClient } from './vectorize.client';
import { VectorizeService, VECTORIZE_QUEUE } from './vectorize.service';
import { VectorizeController } from './vectorize.controller';
import { VectorizeProcessor } from './vectorize.processor';
import { QuotaModule } from '../quota';
import { AuthModule } from '../auth';
import { StorageModule } from '../storage';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          const url = new URL(redisUrl);
          return {
            connection: {
              host: url.hostname,
              port: parseInt(url.port) || 6379,
              password: url.password || undefined,
              username: url.username || undefined,
            },
          };
        }
        return {
          connection: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: VECTORIZE_QUEUE,
    }),
    QuotaModule,
    AuthModule,
    StorageModule,
  ],
  controllers: [VectorizeController],
  providers: [VectorizeClient, VectorizeService, VectorizeProcessor],
  exports: [VectorizeClient, VectorizeService],
})
export class VectorizeModule {}

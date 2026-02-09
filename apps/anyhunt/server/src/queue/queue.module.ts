import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  SCRAPE_QUEUE,
  CRAWL_QUEUE,
  BATCH_SCRAPE_QUEUE,
  VIDEO_TRANSCRIPT_LOCAL_QUEUE,
  VIDEO_TRANSCRIPT_CLOUD_FALLBACK_QUEUE,
} from './queue.constants';
import { parseRedisUrl } from './queue.utils';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>(
          'REDIS_URL',
          'redis://localhost:6379',
        );
        return {
          connection: parseRedisUrl(redisUrl),
          defaultJobOptions: {
            removeOnComplete: 100, // 保留最近 100 个完成的任务
            removeOnFail: 500, // 保留最近 500 个失败的任务
            attempts: 3, // 默认重试 3 次
            backoff: {
              type: 'exponential',
              delay: 2000, // 初始延迟 2 秒
            },
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: SCRAPE_QUEUE,
    }),
    BullModule.registerQueue({
      name: CRAWL_QUEUE,
    }),
    BullModule.registerQueue({
      name: BATCH_SCRAPE_QUEUE,
    }),
    BullModule.registerQueue({
      name: VIDEO_TRANSCRIPT_LOCAL_QUEUE,
    }),
    BullModule.registerQueue({
      name: VIDEO_TRANSCRIPT_CLOUD_FALLBACK_QUEUE,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}

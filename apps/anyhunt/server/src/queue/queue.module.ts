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

const BASE_DEFAULT_JOB_OPTIONS = {
  removeOnComplete: 100, // 保留最近 100 个完成的任务
  removeOnFail: 500, // 保留最近 500 个失败的任务
  attempts: 3, // 默认重试 3 次
  backoff: {
    type: 'exponential',
    delay: 2000, // 初始延迟 2 秒
  },
} as const;

const DEFAULT_JOB_TIMEOUT_MS = 5 * 60 * 1000;
const VIDEO_TRANSCRIPT_BULL_CONFIG_KEY = 'video-transcript';

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
            ...BASE_DEFAULT_JOB_OPTIONS,
            timeout: DEFAULT_JOB_TIMEOUT_MS, // 任务超时 5 分钟（保留原有安全网）
          },
        };
      },
    }),
    BullModule.forRootAsync(VIDEO_TRANSCRIPT_BULL_CONFIG_KEY, {
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>(
          'REDIS_URL',
          'redis://localhost:6379',
        );
        return {
          connection: parseRedisUrl(redisUrl),
          // Video transcript 任务允许长时间运行，不使用默认 5 分钟 timeout 兜底。
          defaultJobOptions: BASE_DEFAULT_JOB_OPTIONS,
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
      configKey: VIDEO_TRANSCRIPT_BULL_CONFIG_KEY,
    }),
    BullModule.registerQueue({
      name: VIDEO_TRANSCRIPT_CLOUD_FALLBACK_QUEUE,
      configKey: VIDEO_TRANSCRIPT_BULL_CONFIG_KEY,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { SCREENSHOT_QUEUE, SCRAPE_QUEUE, CRAWL_QUEUE, BATCH_SCRAPE_QUEUE } from './queue.constants';

/**
 * 解析 Redis URL 为 ioredis 连接选项
 */
function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port, 10) || 6379,
    password: parsed.password || undefined,
    username: parsed.username !== 'default' ? parsed.username : undefined,
  };
}

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
        return {
          connection: parseRedisUrl(redisUrl),
          defaultJobOptions: {
            removeOnComplete: 100, // 保留最近 100 个完成的任务
            removeOnFail: 500,     // 保留最近 500 个失败的任务
            attempts: 3,           // 默认重试 3 次
            backoff: {
              type: 'exponential',
              delay: 2000,         // 初始延迟 2 秒
            },
            timeout: 5 * 60 * 1000, // 任务超时 5 分钟
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: SCREENSHOT_QUEUE,
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
  ],
  exports: [BullModule],
})
export class QueueModule {}

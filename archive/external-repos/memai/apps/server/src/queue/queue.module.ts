import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { TASK_QUEUE } from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
        defaultJobOptions: {
          removeOnComplete: 100, // 保留最近 100 个完成的任务
          removeOnFail: 500,     // 保留最近 500 个失败的任务
          attempts: 3,           // 默认重试 3 次
          backoff: {
            type: 'exponential',
            delay: 2000,         // 初始延迟 2 秒
          },
        },
      }),
    }),
    BullModule.registerQueue({
      name: TASK_QUEUE,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}

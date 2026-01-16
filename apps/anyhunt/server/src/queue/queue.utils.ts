/**
 * BullMQ 队列工具函数
 */
import { QueueEvents } from 'bullmq';
import type { ConfigService } from '@nestjs/config';

/**
 * 创建 QueueEvents 实例
 * 用于等待任务完成（waitUntilFinished）
 *
 * @param queueName 队列名称
 * @param config ConfigService 实例，用于读取 REDIS_URL
 */
export function createQueueEvents(
  queueName: string,
  config: ConfigService,
): QueueEvents {
  const redisUrl = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
  const parsed = new URL(redisUrl);

  return new QueueEvents(queueName, {
    connection: {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 6379,
      password: parsed.password || undefined,
    },
  });
}

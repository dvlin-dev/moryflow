/**
 * [PROVIDES]: Redis URL 解析 + QueueEvents 工具
 * [DEPENDS]: bullmq QueueEvents, ConfigService
 * [POS]: BullMQ 连接配置与同步等待的统一入口
 */
import { QueueEvents } from 'bullmq';
import type { ConfigService } from '@nestjs/config';

type RedisConnectionOptions = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, never>;
};

/**
 * 解析 Redis URL 为 ioredis 连接选项
 */
export function parseRedisUrl(url: string): RedisConnectionOptions {
  const parsed = new URL(url);
  const db =
    parsed.pathname && parsed.pathname !== '/'
      ? Number(parsed.pathname.slice(1))
      : NaN;

  return {
    host: parsed.hostname,
    port: parseInt(parsed.port, 10) || 6379,
    password: parsed.password || undefined,
    username:
      parsed.username && parsed.username !== 'default'
        ? parsed.username
        : undefined,
    ...(Number.isInteger(db) ? { db } : {}),
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

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

  return new QueueEvents(queueName, {
    connection: parseRedisUrl(redisUrl),
  });
}

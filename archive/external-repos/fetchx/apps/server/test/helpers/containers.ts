/**
 * Testcontainers 封装
 * 提供 PostgreSQL 和 Redis 容器的启动和停止
 */
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import {
  RedisContainer,
  type StartedRedisContainer,
} from '@testcontainers/redis';
import { execSync } from 'child_process';

export class TestContainers {
  private static pgContainer: StartedPostgreSqlContainer | null = null;
  private static redisContainer: StartedRedisContainer | null = null;
  private static initialized = false;

  /**
   * 启动所有容器
   */
  static async start(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[TestContainers] Starting containers...');

    // 并行启动容器
    const [pg, redis] = await Promise.all([
      new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('aiget_test')
        .withUsername('test')
        .withPassword('test')
        .start(),
      new RedisContainer('redis:7-alpine').start(),
    ]);

    this.pgContainer = pg;
    this.redisContainer = redis;

    // 设置环境变量
    process.env.DATABASE_URL = pg.getConnectionUri();
    process.env.REDIS_URL = redis.getConnectionUrl();

    console.log(`[TestContainers] PostgreSQL: ${process.env.DATABASE_URL}`);
    console.log(`[TestContainers] Redis: ${process.env.REDIS_URL}`);

    // 运行 Prisma migrate
    await this.runMigrations();

    this.initialized = true;
    console.log('[TestContainers] Containers ready');
  }

  /**
   * 停止所有容器
   */
  static async stop(): Promise<void> {
    console.log('[TestContainers] Stopping containers...');

    await Promise.all([
      this.pgContainer?.stop(),
      this.redisContainer?.stop(),
    ]);

    this.pgContainer = null;
    this.redisContainer = null;
    this.initialized = false;

    console.log('[TestContainers] Containers stopped');
  }

  /**
   * 运行数据库迁移
   */
  private static async runMigrations(): Promise<void> {
    console.log('[TestContainers] Running migrations...');
    try {
      execSync('npx prisma db push --skip-generate', {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
        stdio: 'pipe',
      });
      console.log('[TestContainers] Migrations completed');
    } catch (error) {
      console.error('[TestContainers] Migration failed:', error);
      throw error;
    }
  }

  /**
   * 重置数据库（清空所有数据）
   */
  static async resetDatabase(): Promise<void> {
    if (!this.pgContainer) {
      throw new Error('Containers not started');
    }

    console.log('[TestContainers] Resetting database...');
    try {
      execSync('npx prisma db push --force-reset --skip-generate', {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
        stdio: 'pipe',
      });
      console.log('[TestContainers] Database reset completed');
    } catch (error) {
      console.error('[TestContainers] Database reset failed:', error);
      throw error;
    }
  }

  /**
   * 获取容器状态
   */
  static isRunning(): boolean {
    return this.initialized && this.pgContainer !== null && this.redisContainer !== null;
  }

  /**
   * 获取 PostgreSQL 连接 URI
   */
  static getPostgresUri(): string {
    if (!this.pgContainer) {
      throw new Error('PostgreSQL container not started');
    }
    return this.pgContainer.getConnectionUri();
  }

  /**
   * 获取 Redis 连接 URL
   */
  static getRedisUrl(): string {
    if (!this.redisContainer) {
      throw new Error('Redis container not started');
    }
    return this.redisContainer.getConnectionUrl();
  }
}

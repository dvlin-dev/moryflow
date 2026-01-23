/**
 * [PROVIDES]: TestContainers - PostgreSQL/Redis/Vector 测试容器生命周期管理
 * [DEPENDS]: @testcontainers/postgresql, @testcontainers/redis, prisma CLI
 * [POS]: 集成测试启动与迁移入口，供 test/helpers 调用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
  private static vectorContainer: StartedPostgreSqlContainer | null = null;
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
    const [pg, redis, vector] = await Promise.all([
      new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('aiget_test')
        .withUsername('test')
        .withPassword('test')
        .start(),
      new RedisContainer('redis:7-alpine').start(),
      new PostgreSqlContainer('pgvector/pgvector:pg16')
        .withDatabase('aiget_vector_test')
        .withUsername('test')
        .withPassword('test')
        .start(),
    ]);

    this.pgContainer = pg;
    this.vectorContainer = vector;
    this.redisContainer = redis;

    // 设置环境变量
    process.env.DATABASE_URL = pg.getConnectionUri();
    process.env.REDIS_URL = redis.getConnectionUrl();
    process.env.VECTOR_DATABASE_URL = vector.getConnectionUri();

    console.log(`[TestContainers] PostgreSQL: ${process.env.DATABASE_URL}`);
    console.log(`[TestContainers] Redis: ${process.env.REDIS_URL}`);
    console.log(
      `[TestContainers] Vector PostgreSQL: ${process.env.VECTOR_DATABASE_URL}`,
    );

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
      this.vectorContainer?.stop(),
      this.redisContainer?.stop(),
    ]);

    this.pgContainer = null;
    this.vectorContainer = null;
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
      execSync('npx prisma db push --config prisma.main.config.ts', {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
        stdio: 'pipe',
      });
      execSync('npx prisma db push --config prisma.vector.config.ts', {
        cwd: process.cwd(),
        env: {
          ...process.env,
          VECTOR_DATABASE_URL: process.env.VECTOR_DATABASE_URL,
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
      execSync(
        'npx prisma db push --force-reset --config prisma.main.config.ts',
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            DATABASE_URL: process.env.DATABASE_URL,
          },
          stdio: 'pipe',
        },
      );
      execSync(
        'npx prisma db push --force-reset --config prisma.vector.config.ts',
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            VECTOR_DATABASE_URL: process.env.VECTOR_DATABASE_URL,
          },
          stdio: 'pipe',
        },
      );
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
    return (
      this.initialized &&
      this.pgContainer !== null &&
      this.vectorContainer !== null &&
      this.redisContainer !== null
    );
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
   * 获取 Vector PostgreSQL 连接 URI
   */
  static getVectorPostgresUri(): string {
    if (!this.vectorContainer) {
      throw new Error('Vector PostgreSQL container not started');
    }
    return this.vectorContainer.getConnectionUri();
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

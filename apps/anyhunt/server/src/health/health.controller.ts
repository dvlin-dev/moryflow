/**
 * [INPUT]: HTTP requests for health probes (live/ready/version)
 * [OUTPUT]: HealthCheckResponse / HealthVersionResponse
 * [POS]: 健康检查端点（运维探针 + 部署版本确认）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { SkipResponseWrap } from '../common/decorators';
import { PrismaService } from '../prisma';
import { RedisService } from '../redis';

interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: boolean;
    redis: boolean;
  };
}

interface HealthVersionResponse {
  /**
   * 应用版本（优先 APP_VERSION，其次 npm package version）
   * 用于快速确认线上是否已部署到预期版本。
   */
  version: string;
  /** 可选：CI/CD 注入的 git commit sha */
  gitSha: string | null;
  /** 可选：CI/CD 注入的构建时间（ISO 字符串） */
  buildTime: string | null;
  timestamp: string;
}

@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
@SkipResponseWrap()
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @ApiOperation({ summary: '健康检查', description: '检查所有服务的健康状态' })
  @ApiResponse({ status: 200, description: '健康检查结果' })
  @Public()
  @Get()
  async check(): Promise<HealthCheckResponse> {
    const [dbOk, redisOk] = await Promise.all([
      this.checkDatabase(),
      this.redis.ping(),
    ]);

    return {
      status: dbOk && redisOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      services: {
        database: dbOk,
        redis: redisOk,
      },
    };
  }

  /**
   * Liveness probe - 只检查进程存活
   */
  @ApiOperation({
    summary: 'Liveness Probe',
    description: 'Kubernetes Liveness 探针 - 检查进程是否存活',
  })
  @ApiResponse({ status: 200, description: '进程存活' })
  @Public()
  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /**
   * Readiness probe - 检查所有依赖服务
   */
  @ApiOperation({
    summary: 'Readiness Probe',
    description: 'Kubernetes Readiness 探针 - 检查所有依赖服务',
  })
  @ApiResponse({ status: 200, description: '服务就绪' })
  @Public()
  @Get('ready')
  async ready(): Promise<HealthCheckResponse> {
    return this.check();
  }

  /**
   * Version probe - 用于确认部署版本（不依赖 DB/Redis）
   */
  @ApiOperation({
    summary: 'Version Probe',
    description: '用于确认当前服务版本/构建信息（不依赖 DB/Redis）',
  })
  @ApiResponse({ status: 200, description: '版本信息' })
  @Public()
  @Get('version')
  version(): HealthVersionResponse {
    return {
      version:
        process.env.APP_VERSION ?? process.env.npm_package_version ?? 'unknown',
      gitSha: process.env.GIT_SHA ?? null,
      buildTime: process.env.BUILD_TIME ?? null,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

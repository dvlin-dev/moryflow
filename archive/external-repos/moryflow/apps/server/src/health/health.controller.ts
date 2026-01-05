/**
 * Health Controller
 * 健康检查端点 - 验证数据库和 Redis 连接
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators';
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

@ApiTags('Health')
@Controller('health')
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

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

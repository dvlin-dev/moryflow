/**
 * [INPUT]: HTTP 请求
 * [OUTPUT]: 服务健康状态
 * [POS]: Auth Service 健康检查接口
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 templates/auth-service/README.md
 */

import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

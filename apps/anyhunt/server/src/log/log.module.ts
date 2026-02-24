/**
 * [INPUT]: none
 * [OUTPUT]: RequestLog 模块依赖注入与 Admin 查询接口
 * [POS]: 请求日志模块装配入口
 */

import { Module } from '@nestjs/common';
import { RequestLogController } from './request-log.controller';
import { RequestLogMiddleware } from './request-log.middleware';
import { RequestLogService } from './request-log.service';
import { RequestLogCleanupService } from './request-log-cleanup.service';

@Module({
  controllers: [RequestLogController],
  providers: [
    RequestLogService,
    RequestLogMiddleware,
    RequestLogCleanupService,
  ],
  exports: [RequestLogService, RequestLogMiddleware],
})
export class LogModule {}

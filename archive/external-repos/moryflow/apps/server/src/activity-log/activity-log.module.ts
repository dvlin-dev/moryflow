/**
 * ActivityLog Module
 * 活动日志模块
 */

import { Module, Global } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogController } from './activity-log.controller';

@Global() // 全局模块，方便其他模块注入
@Module({
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}

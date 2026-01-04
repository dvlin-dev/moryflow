/**
 * Alert Module
 * 告警系统模块
 */

import { Module } from '@nestjs/common';
import { AlertService } from './alert.service';
import { AlertDetectorService } from './alert-detector.service';
import { AlertNotificationService } from './alert-notification.service';
import { PrismaModule } from '../prisma';

@Module({
  imports: [PrismaModule],
  providers: [AlertService, AlertDetectorService, AlertNotificationService],
  exports: [AlertService, AlertDetectorService],
})
export class AlertModule {}

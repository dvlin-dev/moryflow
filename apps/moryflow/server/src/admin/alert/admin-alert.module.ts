/**
 * Admin Alert Module
 * 管理后台告警模块
 */

import { Module } from '@nestjs/common';
import { AdminAlertController } from './admin-alert.controller';
import { AlertModule } from '../../alert';

@Module({
  imports: [AlertModule],
  controllers: [AdminAlertController],
})
export class AdminAlertModule {}

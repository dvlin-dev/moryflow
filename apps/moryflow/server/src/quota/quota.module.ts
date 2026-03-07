/**
 * [INPUT]: QuotaController + QuotaService + AuthModule（AuthGuard 依赖）
 * [OUTPUT]: 用量统计模块（Quota API + 服务注入）
 * [POS]: Quota 模块入口，被 AppModule/Sync 等模块复用
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { QuotaController } from './quota.controller';
import { QuotaService } from './quota.service';

@Module({
  imports: [AuthModule],
  controllers: [QuotaController],
  providers: [QuotaService],
  exports: [QuotaService],
})
export class QuotaModule {}

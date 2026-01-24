/**
 * [INPUT]: QuotaController + QuotaService + AuthModule（AuthGuard 依赖）
 * [OUTPUT]: 用量统计模块（Quota API + 服务注入）
 * [POS]: Quota 模块入口，被 AppModule/Vectorize/Sync 等模块复用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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

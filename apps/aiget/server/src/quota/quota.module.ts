/**
 * [DEFINES]: 配额模块
 * [USED_BY]: app.module.ts
 * [POS]: 配额模块入口，注册服务和控制器
 */

import { Module, forwardRef } from '@nestjs/common';
import { QuotaController } from './quota.controller';
import { QuotaService } from './quota.service';
import { QuotaRepository } from './quota.repository';
import { ApiKeyModule } from '../api-key/api-key.module';

@Module({
  imports: [
    // 使用 forwardRef 解决循环依赖
    forwardRef(() => ApiKeyModule),
  ],
  controllers: [QuotaController],
  providers: [QuotaService, QuotaRepository],
  exports: [QuotaService, QuotaRepository],
})
export class QuotaModule {}

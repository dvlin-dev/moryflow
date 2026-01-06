/**
 * [PROVIDES]: OpenApiModule
 * [DEPENDS]: OpenApiService
 * [POS]: OpenAPI 配置模块，仅在 main.ts 中通过 app.get() 使用
 */

import { Module } from '@nestjs/common';
import { OpenApiService } from './openapi.service';

@Module({
  providers: [OpenApiService],
  exports: [OpenApiService],
})
export class OpenApiModule {}

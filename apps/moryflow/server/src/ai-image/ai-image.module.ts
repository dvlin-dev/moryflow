/**
 * AI Image Module
 * 提供 OpenAI 兼容的图片生成 API
 *
 * 认证由全局 AuthGuard 处理（支持 Cookie 和 Bearer Token）
 */

import { Module } from '@nestjs/common';
import { AiImageController } from './ai-image.controller';
import { AiImageService } from './ai-image.service';
import { CreditModule } from '../credit';
import { ActivityLogModule } from '../activity-log';

@Module({
  imports: [CreditModule, ActivityLogModule],
  controllers: [AiImageController],
  providers: [AiImageService],
  exports: [AiImageService],
})
export class AiImageModule {}

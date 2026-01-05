/**
 * AI Admin Module
 * 管理 AI Provider 和 Model 配置
 */

import { Module } from '@nestjs/common';
import { AiAdminController } from './ai-admin.controller';
import { AiAdminService } from './ai-admin.service';
import { PrismaModule } from '../prisma';
import { AiProxyModule } from '../ai-proxy';

@Module({
  imports: [PrismaModule, AiProxyModule],
  controllers: [AiAdminController],
  providers: [AiAdminService],
  exports: [AiAdminService],
})
export class AiAdminModule {}

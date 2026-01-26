/**
 * Webhook 模块
 */

import { Module } from '@nestjs/common';
import { ApiKeyModule } from '../api-key';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [ApiKeyModule],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}

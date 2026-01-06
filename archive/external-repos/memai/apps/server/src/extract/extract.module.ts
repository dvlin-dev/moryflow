import { Module } from '@nestjs/common';
import { ExtractController } from './extract.controller';
import { ExtractService } from './extract.service';
import { LlmModule } from '../llm';
import { EntityModule } from '../entity';
import { RelationModule } from '../relation';
import { ApiKeyModule } from '../api-key';
import { QuotaModule } from '../quota';
import { UsageModule } from '../usage';
import { SubscriptionModule } from '../subscription';

@Module({
  imports: [LlmModule, EntityModule, RelationModule, ApiKeyModule, QuotaModule, UsageModule, SubscriptionModule],
  controllers: [ExtractController],
  providers: [ExtractService],
  exports: [ExtractService],
})
export class ExtractModule {}

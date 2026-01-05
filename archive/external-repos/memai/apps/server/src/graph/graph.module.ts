import { Module } from '@nestjs/common';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
import { EntityModule } from '../entity';
import { RelationModule } from '../relation';
import { ApiKeyModule } from '../api-key';
import { QuotaModule } from '../quota';
import { UsageModule } from '../usage';
import { SubscriptionModule } from '../subscription';

@Module({
  imports: [EntityModule, RelationModule, ApiKeyModule, QuotaModule, UsageModule, SubscriptionModule],
  controllers: [GraphController],
  providers: [GraphService],
  exports: [GraphService],
})
export class GraphModule {}

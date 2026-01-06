import { Module } from '@nestjs/common';
import { RelationController } from './relation.controller';
import { RelationService } from './relation.service';
import { RelationRepository } from './relation.repository';
import { PrismaModule } from '../prisma';
import { QuotaModule } from '../quota';
import { UsageModule } from '../usage';
import { SubscriptionModule } from '../subscription';
import { ApiKeyModule } from '../api-key';

@Module({
  imports: [PrismaModule, QuotaModule, UsageModule, SubscriptionModule, ApiKeyModule],
  controllers: [RelationController],
  providers: [RelationService, RelationRepository],
  exports: [RelationService, RelationRepository],
})
export class RelationModule {}

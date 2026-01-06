import { Module } from '@nestjs/common';
import { EntityController } from './entity.controller';
import { ConsoleEntityController } from './console-entity.controller';
import { EntityService } from './entity.service';
import { EntityRepository } from './entity.repository';
import { PrismaModule } from '../prisma';
import { QuotaModule } from '../quota';
import { UsageModule } from '../usage';
import { SubscriptionModule } from '../subscription';
import { ApiKeyModule } from '../api-key';

@Module({
  imports: [PrismaModule, QuotaModule, UsageModule, SubscriptionModule, ApiKeyModule],
  controllers: [EntityController, ConsoleEntityController],
  providers: [EntityService, EntityRepository],
  exports: [EntityService, EntityRepository],
})
export class EntityModule {}

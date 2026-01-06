import { Module } from '@nestjs/common';
import { MemoryController } from './memory.controller';
import { ConsoleMemoryController } from './console-memory.controller';
import { MemoryService } from './memory.service';
import { MemoryRepository } from './memory.repository';
import { PrismaModule } from '../prisma';
import { EmbeddingModule } from '../embedding';
import { QuotaModule } from '../quota';
import { UsageModule } from '../usage';
import { SubscriptionModule } from '../subscription';
import { ApiKeyModule } from '../api-key';

@Module({
  imports: [
    PrismaModule,
    EmbeddingModule,
    QuotaModule,
    UsageModule,
    SubscriptionModule,
    ApiKeyModule,
  ],
  controllers: [MemoryController, ConsoleMemoryController],
  providers: [MemoryService, MemoryRepository],
  exports: [MemoryService, MemoryRepository],
})
export class MemoryModule {}

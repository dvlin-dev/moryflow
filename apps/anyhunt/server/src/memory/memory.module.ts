import { Module } from '@nestjs/common';
import { MemoryController } from './memory.controller';
import { ConsoleMemoryController } from './console-memory.controller';
import { MemoryService } from './memory.service';
import { MemoryRepository } from './memory.repository';
import { PrismaModule } from '../prisma';
import { EmbeddingModule } from '../embedding';
import { BillingModule } from '../billing/billing.module';
import { ApiKeyModule } from '../api-key';

@Module({
  imports: [PrismaModule, EmbeddingModule, BillingModule, ApiKeyModule],
  controllers: [MemoryController, ConsoleMemoryController],
  providers: [MemoryService, MemoryRepository],
  exports: [MemoryService, MemoryRepository],
})
export class MemoryModule {}

import { Module } from '@nestjs/common';
import { MemoxModule } from '../memox';
import { MemoryClient } from './memory.client';
import { MemoryController } from './memory.controller';
import { MemoryService } from './memory.service';

@Module({
  imports: [MemoxModule],
  controllers: [MemoryController],
  providers: [MemoryClient, MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}

import { Module } from '@nestjs/common';
import { QueueModule } from '../queue';
import { MemoxPlatformModule } from '../memox-platform';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyCleanupProcessor } from './api-key-cleanup.processor';
import { ApiKeyCleanupService } from './api-key-cleanup.service';
import { ApiKeyService } from './api-key.service';

@Module({
  imports: [QueueModule, MemoxPlatformModule],
  controllers: [ApiKeyController],
  providers: [ApiKeyService, ApiKeyCleanupService, ApiKeyCleanupProcessor],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}

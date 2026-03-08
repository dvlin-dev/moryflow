import { Global, Module } from '@nestjs/common';
import { StorageModule } from '../storage';
import { VectorPrismaModule } from '../vector-prisma';
import { MemoxPlatformService } from './memox-platform.service';
import { MemoxTenantTeardownService } from './memox-tenant-teardown.service';

@Global()
@Module({
  imports: [VectorPrismaModule, StorageModule],
  providers: [MemoxPlatformService, MemoxTenantTeardownService],
  exports: [MemoxPlatformService, MemoxTenantTeardownService],
})
export class MemoxPlatformModule {}

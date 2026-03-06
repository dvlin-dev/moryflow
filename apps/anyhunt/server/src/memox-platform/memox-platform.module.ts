import { Global, Module } from '@nestjs/common';
import { MemoxPlatformService } from './memox-platform.service';

@Global()
@Module({
  providers: [MemoxPlatformService],
  exports: [MemoxPlatformService],
})
export class MemoxPlatformModule {}

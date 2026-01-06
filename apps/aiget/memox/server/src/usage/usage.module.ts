import { Module } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';
import { ConsoleStatsController } from './console-stats.controller';
import { PrismaModule } from '../prisma';
import { AuthModule } from '../auth';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UsageController, ConsoleStatsController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}

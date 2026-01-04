import { Module } from '@nestjs/common';
import { AgentTraceController } from './agent-trace.controller';
import { AgentTraceService } from './agent-trace.service';
import { AgentTraceCleanupService } from './agent-trace-cleanup.service';
import { PrismaModule } from '../prisma';
import { AuthModule } from '../auth';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AgentTraceController],
  providers: [AgentTraceService, AgentTraceCleanupService],
  exports: [AgentTraceService, AgentTraceCleanupService],
})
export class AgentTraceModule {}

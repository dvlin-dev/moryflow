import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminSiteController, AdminSiteService } from './site';
import {
  AdminAgentTraceController,
  AdminAgentTraceService,
} from './agent-trace';
import { AdminAlertModule } from './alert';
import { AdminGuard } from '../common/guards';
import { CreditModule } from '../credit';
import { PrismaModule } from '../prisma';
import { SiteModule } from '../site/site.module';
import { AgentTraceModule } from '../agent-trace';

@Module({
  imports: [
    CreditModule,
    PrismaModule,
    SiteModule,
    AdminAlertModule,
    AgentTraceModule,
  ],
  controllers: [
    AdminController,
    AdminSiteController,
    AdminAgentTraceController,
  ],
  providers: [
    AdminService,
    AdminSiteService,
    AdminAgentTraceService,
    AdminGuard,
  ],
  exports: [AdminService, AdminSiteService, AdminAgentTraceService],
})
export class AdminModule {}

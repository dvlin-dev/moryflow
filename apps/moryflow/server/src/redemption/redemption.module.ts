import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { CreditModule } from '../credit';
import { ActivityLogModule } from '../activity-log';
import { RedemptionService } from './redemption.service';
import { RedemptionController } from './redemption.controller';
import { AdminRedemptionCodesController } from './admin-redemption-codes.controller';

@Module({
  imports: [PrismaModule, CreditModule, ActivityLogModule],
  controllers: [RedemptionController],
  providers: [RedemptionService],
  exports: [RedemptionService],
})
export class RedemptionModule {}

@Module({
  imports: [RedemptionModule],
  controllers: [AdminRedemptionCodesController],
})
export class AdminRedemptionModule {}

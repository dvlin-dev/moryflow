import { Module } from '@nestjs/common';
import { RedemptionService } from './redemption.service';
import { AdminRedemptionCodesController } from './admin-redemption-codes.controller';
import { RedemptionController } from './redemption.controller';

@Module({
  controllers: [AdminRedemptionCodesController, RedemptionController],
  providers: [RedemptionService],
  exports: [RedemptionService],
})
export class RedemptionModule {}

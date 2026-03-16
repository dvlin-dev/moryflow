import { Module } from '@nestjs/common';
import { ApiKeyModule } from '../api-key';
import { RedemptionService } from './redemption.service';
import { AdminRedemptionCodesController } from './admin-redemption-codes.controller';
import { RedemptionController } from './redemption.controller';
import { RedemptionInternalController } from './redemption-internal.controller';

@Module({
  imports: [ApiKeyModule],
  controllers: [
    AdminRedemptionCodesController,
    RedemptionController,
    RedemptionInternalController,
  ],
  providers: [RedemptionService],
  exports: [RedemptionService],
})
export class RedemptionModule {}

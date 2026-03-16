import { Module } from '@nestjs/common';
import { RedemptionProxyController } from './redemption-proxy.controller';
import { RedemptionProxyService } from './redemption-proxy.service';

@Module({
  controllers: [RedemptionProxyController],
  providers: [RedemptionProxyService],
})
export class RedemptionModule {}

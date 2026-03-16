import { Module } from '@nestjs/common';
import { RedemptionProxyController } from './redemption-proxy.controller';
import { RedemptionProxyService } from './redemption-proxy.service';
import { CreditModule } from '../credit';

@Module({
  imports: [CreditModule],
  controllers: [RedemptionProxyController],
  providers: [RedemptionProxyService],
})
export class RedemptionModule {}

import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentWebhookController } from './payment-webhook.controller';
import { PaymentSuccessController } from './payment-success.controller';
import { CreditModule } from '../credit';
import { LicenseModule } from '../license';
import { AuthModule } from '../auth';

@Module({
  imports: [CreditModule, LicenseModule, AuthModule],
  controllers: [
    PaymentController,
    PaymentWebhookController,
    PaymentSuccessController,
  ],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}

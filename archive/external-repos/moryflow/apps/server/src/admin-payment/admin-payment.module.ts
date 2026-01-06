/**
 * Admin Payment Module
 * 管理订阅、订单、优惠码
 */

import { Module } from '@nestjs/common';
import { AdminPaymentController } from './admin-payment.controller';
import { AdminPaymentService } from './admin-payment.service';
import { PrismaModule } from '../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [AdminPaymentController],
  providers: [AdminPaymentService],
  exports: [AdminPaymentService],
})
export class AdminPaymentModule {}

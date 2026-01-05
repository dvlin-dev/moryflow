import { Module } from '@nestjs/common';
import { CreditService } from './credit.service';

@Module({
  providers: [CreditService],
  exports: [CreditService],
})
export class CreditModule {}

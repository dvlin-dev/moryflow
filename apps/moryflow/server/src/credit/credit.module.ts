import { Module } from '@nestjs/common';
import { CreditService } from './credit.service';
import { CreditLedgerModule } from '../credit-ledger';
import { PrismaModule } from '../prisma';
import { RedisModule } from '../redis';

@Module({
  imports: [PrismaModule, RedisModule, CreditLedgerModule],
  providers: [CreditService],
  exports: [CreditService, CreditLedgerModule],
})
export class CreditModule {}

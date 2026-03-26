import { Module } from '@nestjs/common';
import { CreditLedgerService } from './credit-ledger.service';
import { CreditLedgerQueryService } from './credit-ledger-query.service';
import { PrismaModule } from '../prisma';

@Module({
  imports: [PrismaModule],
  providers: [CreditLedgerService, CreditLedgerQueryService],
  exports: [CreditLedgerService, CreditLedgerQueryService],
})
export class CreditLedgerModule {}

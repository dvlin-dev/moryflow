import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IdempotencyExecutorService } from './idempotency-executor.service';
import { IdempotencyService } from './idempotency.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [IdempotencyService, IdempotencyExecutorService],
  exports: [IdempotencyService, IdempotencyExecutorService],
})
export class IdempotencyModule {}

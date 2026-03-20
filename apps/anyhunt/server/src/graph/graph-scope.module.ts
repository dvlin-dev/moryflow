import { Module } from '@nestjs/common';
import { VectorPrismaModule } from '../vector-prisma';
import { GraphScopeService } from './graph-scope.service';

@Module({
  imports: [VectorPrismaModule],
  providers: [GraphScopeService],
  exports: [GraphScopeService],
})
export class GraphScopeModule {}

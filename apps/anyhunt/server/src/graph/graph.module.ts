import { Module } from '@nestjs/common';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
import { EntityModule } from '../entity';
import { RelationModule } from '../relation';
import { ApiKeyModule } from '../api-key';

@Module({
  imports: [EntityModule, RelationModule, ApiKeyModule],
  controllers: [GraphController],
  providers: [GraphService],
  exports: [GraphService],
})
export class GraphModule {}

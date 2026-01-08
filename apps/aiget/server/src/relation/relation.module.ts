/**
 * [PROVIDES]: RelationService, RelationRepository
 * [POS]: Relation 模块（向量数据库）
 */

import { Module } from '@nestjs/common';
import { RelationController } from './relation.controller';
import { RelationService } from './relation.service';
import { RelationRepository } from './relation.repository';
import { ApiKeyModule } from '../api-key';

@Module({
  imports: [ApiKeyModule],
  controllers: [RelationController],
  providers: [RelationService, RelationRepository],
  exports: [RelationService, RelationRepository],
})
export class RelationModule {}

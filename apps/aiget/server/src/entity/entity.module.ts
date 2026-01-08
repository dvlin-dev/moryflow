/**
 * [PROVIDES]: EntityService, EntityRepository
 * [POS]: Entity 模块（向量数据库）
 */

import { Module } from '@nestjs/common';
import { EntityController } from './entity.controller';
import { ConsoleEntityController } from './console-entity.controller';
import { EntityService } from './entity.service';
import { EntityRepository } from './entity.repository';
import { ApiKeyModule } from '../api-key';

@Module({
  imports: [ApiKeyModule],
  controllers: [EntityController, ConsoleEntityController],
  providers: [EntityService, EntityRepository],
  exports: [EntityService, EntityRepository],
})
export class EntityModule {}

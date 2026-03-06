/**
 * [PROVIDES]: ScopeRegistryService, ScopeRegistryRepository
 * [POS]: ScopeRegistry 模块（向量数据库）
 */

import { Module } from '@nestjs/common';
import { ScopeRegistryService } from './scope-registry.service';
import { ScopeRegistryRepository } from './scope-registry.repository';

@Module({
  providers: [ScopeRegistryService, ScopeRegistryRepository],
  exports: [ScopeRegistryService, ScopeRegistryRepository],
})
export class ScopeRegistryModule {}

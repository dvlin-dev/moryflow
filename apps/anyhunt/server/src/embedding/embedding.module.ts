/**
 * [INPUT]: Embedding module registration
 * [OUTPUT]: NestJS module wiring for embedding provider
 * [POS]: Embedding 模块入口，向外暴露 EmbeddingService
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [ConfigModule],
  providers: [EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}

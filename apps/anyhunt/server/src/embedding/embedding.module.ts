/**
 * [INPUT]: Embedding module registration
 * [OUTPUT]: NestJS module wiring for embedding provider
 * [POS]: Embedding 模块入口，向外暴露 EmbeddingService
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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

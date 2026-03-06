/**
 * [PROVIDES]: 公开/内部 OpenAPI 模块注册表
 * [DEPENDS]: 各 NestJS module class
 * [POS]: Swagger 文档 include 事实源，避免 main.ts 内联模块列表漂移
 */

import type { Type } from '@nestjs/common';
import { HealthModule } from '../health';
import { AuthModule } from '../auth';
import { UserModule } from '../user';
import { PaymentModule } from '../payment';
import { StorageModule } from '../storage';
import { ApiKeyModule } from '../api-key';
import { QuotaModule } from '../quota';
import { BrowserModule } from '../browser';
import { ScraperModule } from '../scraper';
import { CrawlerModule } from '../crawler';
import { MapModule } from '../map';
import { BatchScrapeModule } from '../batch-scrape';
import { ExtractModule } from '../extract';
import { SearchModule } from '../search';
import { WebhookModule } from '../webhook';
import { OembedModule } from '../oembed';
import { DemoModule } from '../demo/demo.module';
import { EmbeddingModule } from '../embedding';
import { MemoryModule } from '../memory';
import { RetrievalModule } from '../retrieval';
import { SourcesModule } from '../sources';
import { GraphModule } from '../graph';
import { LlmModule } from '../llm';
import { AgentModule } from '../agent';
import { DigestModule } from '../digest';
import { AdminModule } from '../admin';

export const PUBLIC_API_MODULES: Array<Type<unknown>> = [
  HealthModule,
  AuthModule,
  UserModule,
  PaymentModule,
  StorageModule,
  ApiKeyModule,
  QuotaModule,
  BrowserModule,
  ScraperModule,
  CrawlerModule,
  MapModule,
  BatchScrapeModule,
  ExtractModule,
  SearchModule,
  WebhookModule,
  OembedModule,
  DemoModule,
  EmbeddingModule,
  MemoryModule,
  RetrievalModule,
  SourcesModule,
  GraphModule,
  LlmModule,
  AgentModule,
  DigestModule,
];

export const INTERNAL_API_MODULES: Array<Type<unknown>> = [
  AdminModule,
  LlmModule,
  DigestModule,
];

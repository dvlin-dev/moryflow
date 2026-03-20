/**
 * [INPUT]: ConfigService / MEMOX_* 环境变量
 * [OUTPUT]: 平台级 Source ingest guardrail 配置
 * [POS]: Memox 平台运行时配置事实源
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { DEFAULT_SOURCE_INGEST_GUARDRAILS } from './memox-platform.constants';

const memoxPlatformSchema = z.object({
  MEMOX_MAX_SOURCE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_SOURCE_INGEST_GUARDRAILS.maxSourceBytes),
  MEMOX_MAX_NORMALIZED_TOKENS_PER_REVISION: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_SOURCE_INGEST_GUARDRAILS.maxNormalizedTokensPerRevision),
  MEMOX_MAX_CHUNKS_PER_REVISION: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_SOURCE_INGEST_GUARDRAILS.maxChunksPerRevision),
  MEMOX_MAX_CONCURRENT_SOURCE_JOBS_PER_API_KEY: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_SOURCE_INGEST_GUARDRAILS.maxConcurrentSourceJobsPerApiKey),
  MEMOX_MAX_REINDEX_PER_SOURCE_PER_WINDOW: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_SOURCE_INGEST_GUARDRAILS.maxReindexPerSourcePerWindow),
  MEMOX_REINDEX_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_SOURCE_INGEST_GUARDRAILS.reindexWindowSeconds),
  MEMOX_MAX_FINALIZE_REQUESTS_PER_API_KEY_PER_WINDOW: z.coerce
    .number()
    .int()
    .positive()
    .default(
      DEFAULT_SOURCE_INGEST_GUARDRAILS.maxFinalizeRequestsPerApiKeyPerWindow,
    ),
  MEMOX_FINALIZE_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_SOURCE_INGEST_GUARDRAILS.finalizeWindowSeconds),
});

export interface SourceIngestGuardrails {
  maxSourceBytes: number;
  maxNormalizedTokensPerRevision: number;
  maxChunksPerRevision: number;
  maxConcurrentSourceJobsPerApiKey: number;
  maxReindexPerSourcePerWindow: number;
  reindexWindowSeconds: number;
  maxFinalizeRequestsPerApiKeyPerWindow: number;
  finalizeWindowSeconds: number;
}

@Injectable()
export class MemoxPlatformService {
  private readonly sourceIngestGuardrails: SourceIngestGuardrails;

  constructor(private readonly configService: ConfigService) {
    const getEnv = (key: string) =>
      this.configService.get<string | undefined>(key);
    const parsed = memoxPlatformSchema.parse({
      MEMOX_MAX_SOURCE_BYTES: getEnv('MEMOX_MAX_SOURCE_BYTES'),
      MEMOX_MAX_NORMALIZED_TOKENS_PER_REVISION: getEnv(
        'MEMOX_MAX_NORMALIZED_TOKENS_PER_REVISION',
      ),
      MEMOX_MAX_CHUNKS_PER_REVISION: getEnv('MEMOX_MAX_CHUNKS_PER_REVISION'),
      MEMOX_MAX_CONCURRENT_SOURCE_JOBS_PER_API_KEY: getEnv(
        'MEMOX_MAX_CONCURRENT_SOURCE_JOBS_PER_API_KEY',
      ),
      MEMOX_MAX_REINDEX_PER_SOURCE_PER_WINDOW: getEnv(
        'MEMOX_MAX_REINDEX_PER_SOURCE_PER_WINDOW',
      ),
      MEMOX_REINDEX_WINDOW_SECONDS: getEnv('MEMOX_REINDEX_WINDOW_SECONDS'),
      MEMOX_MAX_FINALIZE_REQUESTS_PER_API_KEY_PER_WINDOW: getEnv(
        'MEMOX_MAX_FINALIZE_REQUESTS_PER_API_KEY_PER_WINDOW',
      ),
      MEMOX_FINALIZE_WINDOW_SECONDS: getEnv('MEMOX_FINALIZE_WINDOW_SECONDS'),
    });

    this.sourceIngestGuardrails = {
      maxSourceBytes: parsed.MEMOX_MAX_SOURCE_BYTES,
      maxNormalizedTokensPerRevision:
        parsed.MEMOX_MAX_NORMALIZED_TOKENS_PER_REVISION,
      maxChunksPerRevision: parsed.MEMOX_MAX_CHUNKS_PER_REVISION,
      maxConcurrentSourceJobsPerApiKey:
        parsed.MEMOX_MAX_CONCURRENT_SOURCE_JOBS_PER_API_KEY,
      maxReindexPerSourcePerWindow:
        parsed.MEMOX_MAX_REINDEX_PER_SOURCE_PER_WINDOW,
      reindexWindowSeconds: parsed.MEMOX_REINDEX_WINDOW_SECONDS,
      maxFinalizeRequestsPerApiKeyPerWindow:
        parsed.MEMOX_MAX_FINALIZE_REQUESTS_PER_API_KEY_PER_WINDOW,
      finalizeWindowSeconds: parsed.MEMOX_FINALIZE_WINDOW_SECONDS,
    };
  }

  getSourceIngestGuardrails(): SourceIngestGuardrails {
    return { ...this.sourceIngestGuardrails };
  }
}

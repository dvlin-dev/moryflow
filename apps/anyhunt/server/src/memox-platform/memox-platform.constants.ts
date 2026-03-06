/**
 * [DEFINES]: Memox 平台级 guardrail 默认值
 * [USED_BY]: memox-platform.service.ts
 */

export const DEFAULT_SOURCE_INGEST_GUARDRAILS = {
  maxSourceBytes: 10 * 1024 * 1024,
  maxNormalizedTokensPerRevision: 500_000,
  maxChunksPerRevision: 2_000,
  maxConcurrentSourceJobsPerApiKey: 5,
  maxReindexPerSourcePerWindow: 3,
  reindexWindowSeconds: 24 * 60 * 60,
  maxFinalizeRequestsPerApiKeyPerWindow: 60,
  finalizeWindowSeconds: 60 * 60,
} as const;

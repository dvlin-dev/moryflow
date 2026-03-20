import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { MemoxPlatformService } from '../memox-platform.service';

describe('MemoxPlatformService', () => {
  const createConfigService = (values: Record<string, string | undefined>) =>
    ({
      get: (key: string) => values[key],
    }) as ConfigService;

  it('returns documented default guardrails when env is unset', () => {
    const service = new MemoxPlatformService(createConfigService({}));

    expect(service.getSourceIngestGuardrails()).toEqual({
      maxSourceBytes: 10 * 1024 * 1024,
      maxNormalizedTokensPerRevision: 500_000,
      maxChunksPerRevision: 2_000,
      maxConcurrentSourceJobsPerApiKey: 5,
      maxReindexPerSourcePerWindow: 3,
      reindexWindowSeconds: 86_400,
      maxFinalizeRequestsPerApiKeyPerWindow: 60,
      finalizeWindowSeconds: 3_600,
    });
  });

  it('throws when guardrail env is invalid', () => {
    expect(
      () =>
        new MemoxPlatformService(
          createConfigService({
            MEMOX_MAX_SOURCE_BYTES: '0',
          }),
        ),
    ).toThrow('MEMOX_MAX_SOURCE_BYTES');
  });
});

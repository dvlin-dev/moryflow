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
    expect(service.isSourceGraphProjectionEnabled()).toBe(false);
  });

  it('allows explicit source graph projection opt-in', () => {
    const service = new MemoxPlatformService(
      createConfigService({
        MEMOX_SOURCE_GRAPH_PROJECTION_ENABLED: 'true',
      }),
    );

    expect(service.isSourceGraphProjectionEnabled()).toBe(true);
  });

  it('keeps explicit false as graph projection off', () => {
    const service = new MemoxPlatformService(
      createConfigService({
        MEMOX_SOURCE_GRAPH_PROJECTION_ENABLED: 'false',
      }),
    );

    expect(service.isSourceGraphProjectionEnabled()).toBe(false);
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

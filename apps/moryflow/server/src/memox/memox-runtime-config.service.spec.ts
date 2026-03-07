import { beforeEach, describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { MemoxRuntimeConfigService } from './memox-runtime-config.service';

describe('MemoxRuntimeConfigService', () => {
  let env: Record<string, string | undefined>;
  let configService: ConfigService;

  beforeEach(() => {
    env = {
      MEMOX_API_BASE_URL: 'https://server.anyhunt.app',
      MEMOX_API_KEY: 'ah_test_key',
    };
    configService = {
      get: (key: string) => env[key],
    } as unknown as ConfigService;
  });

  it('defaults search backend to memox and does not require rollback config at startup', () => {
    const service = new MemoxRuntimeConfigService(configService);

    expect(service.getSearchBackend()).toBe('memox');
    expect(service.getMemoxApiBaseUrl()).toBe('https://server.anyhunt.app');
    expect(service.getMemoxRequestTimeoutMs()).toBe(15000);
    expect(() => service.onModuleInit()).not.toThrow();
  });

  it('requires rollback baseline url only when legacy backend is enabled', () => {
    env.MORYFLOW_SEARCH_BACKEND = 'legacy_vector_baseline';
    const service = new MemoxRuntimeConfigService(configService);

    expect(() => service.onModuleInit()).toThrow(
      'VECTORIZE_API_URL is required for Memox Phase 2 rollback baseline',
    );

    env.VECTORIZE_API_URL = 'https://vectorize.example.com';
    expect(() => service.onModuleInit()).not.toThrow();
    expect(service.getLegacyVectorBaseUrl()).toBe(
      'https://vectorize.example.com',
    );
  });

  it('rejects unsupported search backend values', () => {
    env.MORYFLOW_SEARCH_BACKEND = 'invalid';
    const service = new MemoxRuntimeConfigService(configService);

    expect(() => service.getSearchBackend()).toThrow(
      'MORYFLOW_SEARCH_BACKEND must be one of: memox, legacy_vector_baseline',
    );
  });

  it('rejects non-origin Memox base urls', () => {
    env.MEMOX_API_BASE_URL = 'https://server.anyhunt.app/api/v1';
    const service = new MemoxRuntimeConfigService(configService);

    expect(() => service.getMemoxApiBaseUrl()).toThrow(
      'MEMOX_API_BASE_URL must be origin-only',
    );
  });

  it('rejects invalid timeout values instead of silently falling back', () => {
    env.MEMOX_REQUEST_TIMEOUT_MS = 'abc';
    const service = new MemoxRuntimeConfigService(configService);

    expect(() => service.getMemoxRequestTimeoutMs()).toThrow(
      'MEMOX_REQUEST_TIMEOUT_MS must be a positive integer',
    );
  });
});

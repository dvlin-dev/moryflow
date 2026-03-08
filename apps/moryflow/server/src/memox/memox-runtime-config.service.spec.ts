import { beforeEach, describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { MemoxRuntimeConfigService } from './memox-runtime-config.service';

describe('MemoxRuntimeConfigService', () => {
  let env: Record<string, string | undefined>;
  let configService: ConfigService;

  beforeEach(() => {
    env = {
      ANYHUNT_API_BASE_URL: 'https://server.anyhunt.app',
      ANYHUNT_API_KEY: 'ah_test_key',
    };
    configService = {
      get: (key: string) => env[key],
    } as unknown as ConfigService;
  });

  it('requires only Anyhunt runtime configuration at startup', () => {
    const service = new MemoxRuntimeConfigService(configService);

    expect(service.getAnyhuntApiBaseUrl()).toBe('https://server.anyhunt.app');
    expect(service.getAnyhuntRequestTimeoutMs()).toBe(15000);
    expect(() => service.onModuleInit()).not.toThrow();
  });

  it('rejects non-origin Memox base urls', () => {
    env.ANYHUNT_API_BASE_URL = 'https://server.anyhunt.app/api/v1';
    const service = new MemoxRuntimeConfigService(configService);

    expect(() => service.getAnyhuntApiBaseUrl()).toThrow(
      'ANYHUNT_API_BASE_URL must be origin-only',
    );
  });

  it('rejects invalid timeout values instead of silently falling back', () => {
    env.ANYHUNT_REQUEST_TIMEOUT_MS = 'abc';
    const service = new MemoxRuntimeConfigService(configService);

    expect(() => service.getAnyhuntRequestTimeoutMs()).toThrow(
      'ANYHUNT_REQUEST_TIMEOUT_MS must be a positive integer',
    );
  });
});

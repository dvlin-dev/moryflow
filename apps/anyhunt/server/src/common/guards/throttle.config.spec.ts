import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import {
  getGlobalThrottleConfig,
  shouldSkipGlobalThrottle,
} from './throttle.config';

describe('global throttle config', () => {
  it('should use defaults when env is missing', () => {
    const configService = new ConfigService({});
    const config = getGlobalThrottleConfig(configService);

    expect(config.ttlMs).toBe(60_000);
    expect(config.limit).toBe(300);
    expect(config.blockDurationMs).toBe(60_000);
    expect(config.skipPaths).toEqual([
      '/health',
      '/openapi.json',
      '/openapi-internal.json',
      '/api-reference',
    ]);
  });

  it('should use env values when valid', () => {
    const configService = new ConfigService({
      GLOBAL_THROTTLE_TTL_MS: '90000',
      GLOBAL_THROTTLE_LIMIT: '450',
      GLOBAL_THROTTLE_BLOCK_DURATION_MS: '120000',
      GLOBAL_THROTTLE_SKIP_PATHS: '/health,/internal/metrics,api/docs/,',
    });
    const config = getGlobalThrottleConfig(configService);

    expect(config.ttlMs).toBe(90_000);
    expect(config.limit).toBe(450);
    expect(config.blockDurationMs).toBe(120_000);
    expect(config.skipPaths).toEqual([
      '/health',
      '/internal/metrics',
      '/api/docs',
    ]);
  });

  it('should fallback block duration to ttl when block env is missing', () => {
    const configService = new ConfigService({
      GLOBAL_THROTTLE_TTL_MS: '90000',
      GLOBAL_THROTTLE_LIMIT: '450',
    });
    const config = getGlobalThrottleConfig(configService);

    expect(config.ttlMs).toBe(90_000);
    expect(config.blockDurationMs).toBe(90_000);
  });

  it('should fallback to defaults when env values are invalid', () => {
    const configService = new ConfigService({
      GLOBAL_THROTTLE_TTL_MS: '0',
      GLOBAL_THROTTLE_LIMIT: '-1',
      GLOBAL_THROTTLE_BLOCK_DURATION_MS: 'NaN',
    });
    const config = getGlobalThrottleConfig(configService);

    expect(config.ttlMs).toBe(60_000);
    expect(config.limit).toBe(300);
    expect(config.blockDurationMs).toBe(60_000);
  });
});

describe('shouldSkipGlobalThrottle', () => {
  it('should match exact path and nested paths', () => {
    const skipPaths = ['/health', '/api-reference'];
    expect(shouldSkipGlobalThrottle('/health', skipPaths)).toBe(true);
    expect(shouldSkipGlobalThrottle('/health/live', skipPaths)).toBe(true);
    expect(shouldSkipGlobalThrottle('/api-reference/internal', skipPaths)).toBe(
      true,
    );
    expect(shouldSkipGlobalThrottle('/api/v1/user/me', skipPaths)).toBe(false);
  });
});
